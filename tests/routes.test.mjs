import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const id = "0123456789abcdef01234567";
const owner = { user: { email: "owner@example.invalid" } };
const request = (body, query = "") => ({ url: "http://localhost/api/test" + query, json: async () => body });
async function route(name, dependencies = {}) {
  const code = (await fs.readFile(new URL(`../src/app/api/${name}/route.js`, import.meta.url), "utf8"))
    .replace(/^import .*;[^\r\n]*\r?\n/gm, "").replaceAll("export async function ", "async function ");
  const context = vm.createContext({
    Response, URL, Buffer, console, authOptions: {},
    process: { env: { NEXTAUTH_URL: "http://localhost:3000" } },
    connectDatabase: async () => {}, getServerSession: async () => owner,
    isAdmin: async () => false, ...dependencies,
  });
  new vm.Script(code + "\n globalThis.handler = { GET: typeof GET === 'undefined' ? null : GET, PUT: typeof PUT === 'undefined' ? null : PUT, POST: typeof POST === 'undefined' ? null : POST }; ").runInContext(context);
  return context.handler;
}
function userDependencies(email = owner.user.email) {
  return {
    User: { findOne: () => ({ lean: async () => ({ _id: id, email, name: "Synthetic", password: "never-return-this" }) }) },
    UserInfo: { findOne: () => ({ lean: async () => ({ phone: "synthetic", admin: false, password: "never-return-this-either" }) }) },
  };
}

for (const name of ["profile", "orders"]) {
  test(`${name}: anonymous requests are rejected before database access`, async () => {
    const handlers = await route(name, { getServerSession: async () => null, connectDatabase: async () => assert.fail("database accessed") });
    assert.equal((await handlers.GET(request(null, "?_id=" + id))).status, 401);
    if (handlers.PUT) assert.equal((await handlers.PUT(request({ _id: id, admin: true }))).status, 401);
  });
}
test("profile: another customer's profile is forbidden", async () => {
  const handlers = await route("profile", userDependencies("another@example.invalid"));
  assert.equal((await handlers.GET(request(null, "?_id=" + id))).status, 403);
});
test("profile: response explicitly omits password and retains the User id", async () => {
  const handlers = await route("profile", userDependencies());
  const response = await handlers.GET(request(null));
  assert.equal(response.status, 200);
  const profile = await response.json();
  assert.equal(profile._id, id);
  assert.equal(profile.password, undefined);
  assert.equal(profile.email, owner.user.email);
});
test("profile: a normal user cannot assign an admin role", async () => {
  const handlers = await route("profile", userDependencies());
  assert.equal((await handlers.PUT(request({ admin: true }))).status, 403);
});
test("profile: normal address updates cannot replace the authorization email", async () => {
  let saved;
  const dependencies = userDependencies();
  dependencies.UserInfo.findOneAndUpdate = async (filter, values) => { saved = { filter, values }; };
  const handlers = await route("profile", dependencies);
  assert.equal((await handlers.PUT(request({ phone: "555", email: "injected@example.invalid" }))).status, 200);
  assert.equal(saved.filter.email, owner.user.email);
  assert.equal(saved.values.$set.phone, "555");
  assert.equal(saved.values.$set.email, undefined);
});
test("orders: detail lookup restricts the database query to the owner", async () => {
  let filter;
  const handlers = await route("orders", { Order: { findOne: async value => { filter = value; return null; } } });
  assert.equal((await handlers.GET(request(null, "?_id=" + id))).status, 404);
  assert.equal(filter.userEmail, owner.user.email);
  assert.equal(filter._id, id);
});
test("orders: admin lookup may retrieve another customer's order", async () => {
  let filter;
  const handlers = await route("orders", { isAdmin: async () => true, Order: { findOne: async value => { filter = value; return { _id: id }; } } });
  assert.equal((await handlers.GET(request(null, "?_id=" + id))).status, 200);
  assert.equal(filter.userEmail, undefined);
});
test("register: weak and overlong bcrypt passwords never reach persistence", async () => {
  const handlers = await route("register", { connectDatabase: async () => assert.fail("invalid registration reached database") });
  for (const password of ["x", "", "é".repeat(37)]) {
    assert.equal((await handlers.POST(request({ email: "test@example.invalid", password }))).status, 400);
  }
});
test("register: returns public data only", async () => {
  const handlers = await route("register", {
    bcrypt: { hash: async () => "synthetic-hash" },
    User: { create: async value => ({ _id: id, ...value }) },
  });
  const response = await handlers.POST(request({ email: "test@example.invalid", password: "long-enough-password", admin: true }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).password, undefined);
});
test("upload: anonymous users and arbitrary HTML are rejected without S3", async () => {
  const anonymous = await route("upload", { getServerSession: async () => null });
  assert.equal((await anonymous.POST({})).status, 401);
  const handlers = await route("upload");
  const file = { size: 4, type: "text/html", arrayBuffer: async () => Buffer.from("html") };
  assert.equal((await handlers.POST({ formData: async () => new Map([["file", file]]) })).status, 400);
});
test("checkout: canonical prices and authenticated owner override browser values", async () => {
  let saved, checkout;
  const handlers = await route("checkout", {
    MenuItem: { findById: () => ({ lean: async () => ({ _id: id, name: "Catalog name", basePrice: 10.29 }) }) },
    Order: { create: async value => { saved = value; return { _id: id }; }, updateOne: async () => {} },
    getStripe: () => ({ checkout: { sessions: { create: async value => { checkout = value; return { id: "cs_synthetic", url: "http://localhost/payment" }; } } } }),
  });
  const address = { phone: "555", streetAddress: "Synthetic", postalCode: "00000", city: "Synthetic", country: "MX", userEmail: "injected@example.invalid" };
  const response = await handlers.POST(request({ address, cartProducts: [{ _id: id, name: "Injected", basePrice: 0.01 }] }));
  assert.equal(response.status, 200);
  assert.equal(saved.userEmail, owner.user.email);
  assert.equal(saved.cartProducts[0].name, "Catalog name");
  assert.equal(saved.cartProducts[0].basePrice, 10.29);
  assert.equal(saved.amountTotal, 1529);
  assert.equal(checkout.line_items[0].price_data.unit_amount, 1029);
  assert.equal(checkout.success_url, "http://localhost:3000/orders/" + id + "?clear-cart=1");
});
test("webhook: invalid signatures never reach MongoDB", async () => {
  const handlers = await route("webhook", {
    getStripe: () => ({ webhooks: { constructEvent() { throw new Error("invalid"); } } }),
    connectDatabase: async () => assert.fail("invalid event reached database"),
  });
  assert.equal((await handlers.POST({ text: async () => "synthetic", headers: new Headers() })).status, 400);
});
test("webhook: connects on cold invocation and verifies the expected amount", async () => {
  let connected = false, updated = false;
  const payment = { id: "cs_synthetic", payment_status: "paid", metadata: { orderId: id }, amount_total: 1529, currency: "usd" };
  const handlers = await route("webhook", {
    getStripe: () => ({ webhooks: { constructEvent: () => ({ type: "checkout.session.completed", data: { object: payment } }) } }),
    connectDatabase: async () => { connected = true; },
    Order: { findById: async () => { assert.equal(connected, true); return { amountTotal: 1529, currency: "usd", stripeSessionId: "cs_synthetic" }; }, updateOne: async () => { updated = true; } },
  });
  assert.equal((await handlers.POST({ text: async () => "synthetic", headers: new Headers() })).status, 200);
  assert.equal(updated, true);
  updated = false;
  payment.amount_total = 1;
  assert.equal((await handlers.POST({ text: async () => "synthetic", headers: new Headers() })).status, 400);
  assert.equal(updated, false);
});
