// Characterization checks: a true finding confirms unsafe current behavior.
// External dependencies are replaced with in-memory doubles; no network or real data.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const findings = [];
async function load(relative, names, doubles) {
  const source = (await fs.readFile(path.join(root, relative), 'utf8'))
    .replace(/^import .*;[^\r\n]*\r?\n/gm, '')
    .replace(/export async function /g, 'async function ');
  const context = vm.createContext({
    Response, Buffer, URL, console,
    process: { env: { MONGO_URL: 'in-memory-only', NEXTAUTH_URL: 'http://localhost/' } },
    mongoose: { connect() {} }, authOptions: {}, ...doubles,
  });
  new vm.Script(source + '\n globalThis.handlers = {' + names.join(',') + '};',
    { filename: relative }).runInContext(context);
  return context.handlers;
}
function request(body, url = 'http://localhost/api/profile') {
  return { url, json: async () => body };
}
function record(id, description, observed) {
  assert.equal(observed, true, description);
  findings.push({ id, description, reproduced: true, scope: 'isolated route logic with dependency doubles' });
}

let sessionCalls = 0;
let update;
const profile = await load('src/app/api/profile/route.js', ['GET', 'PUT'], {
  getServerSession: async () => { sessionCalls++; return null; },
  User: {
    findOne: () => Object.assign(Promise.resolve({ email: 'synthetic@example.invalid' }), {
      lean: async () => ({ email: 'synthetic@example.invalid', password: 'synthetic-hash' }),
    }),
    updateOne: async () => {},
  },
  UserInfo: {
    findOne: () => ({ lean: async () => ({ admin: false }) }),
    findOneAndUpdate: async (filter, values) => { update = values; },
  },
});
const exposed = await (await profile.GET(request(null, 'http://localhost/api/profile?_id=synthetic-id'))).json();
record('SEC-01a', 'GET profile by id skips session and exposes password hash',
  sessionCalls === 0 && exposed.password === 'synthetic-hash');
await profile.PUT(request({ _id: 'synthetic-id', name: 'Synthetic', admin: true }));
record('SEC-01b', 'PUT profile by id skips session and forwards admin=true to persistence',
  sessionCalls === 0 && update.admin === true);

const orders = await load('src/app/api/orders/route.js', ['GET'], {
  getServerSession: async () => null,
  isAdmin: async () => false,
  Order: { findById: async () => ({ userEmail: 'another@example.invalid', streetAddress: 'synthetic address' }) },
});
const orderResponse = await orders.GET(request(null, 'http://localhost/api/orders?_id=synthetic-id'));
record('SEC-02', 'Anonymous order lookup by id returns another customer order',
  orderResponse.status === 200 && (await orderResponse.json()).streetAddress === 'synthetic address');

let uploaded = false;
const upload = await load('src/app/api/upload/route.js', ['POST'], {
  uniqid: () => 'synthetic',
  S3Client: class { async send() { uploaded = true; } },
  PutObjectCommand: class { constructor(input) { this.input = input; } },
});
const file = { name: 'synthetic.html', type: 'text/html',
  async *stream() { yield Buffer.from('synthetic payload'); } };
const uploadResponse = await upload.POST({ formData: async () => new Map([['file', file]]) });
record('SEC-03', 'Upload accepts arbitrary HTML file without a session check', uploaded && uploadResponse.status === 200);

let createdPassword;
const register = await load('src/app/api/register/route.js', ['POST'], {
  bcrypt: { genSaltSync: () => 'synthetic-salt', hashSync: value => 'synthetic-hash:' + value },
  User: { create: async body => { createdPassword = body.password; return body; } },
});
const registerResponse = await register.POST(request({ email: 'synthetic@example.invalid', password: 'x' }));
record('SEC-04', 'One-character password reaches persistence because Error is not thrown',
  registerResponse.status === 200 && createdPassword === 'synthetic-hash:x');

let orderSaved;
const checkout = await load('src/app/api/checkout/route.js', ['POST'], {
  getServerSession: async () => ({ user: { email: 'owner@example.invalid' } }),
  require: () => () => ({ checkout: { sessions: { create: async () => ({ url: 'http://localhost/synthetic-checkout' }) } } }),
  MenuItem: { findById: async () => ({ basePrice: 10 }) },
  Order: { create: async body => { orderSaved = body; return { _id: 'synthetic-id' }; } },
});
await checkout.POST(request({
  address: { userEmail: 'injected@example.invalid' },
  cartProducts: [{ _id: 'synthetic-product', name: 'Synthetic', basePrice: 0.01 }],
}));
record('SEC-05', 'Checkout address overwrites order owner and saves client price snapshot',
  orderSaved.userEmail === 'injected@example.invalid' && orderSaved.cartProducts[0].basePrice === 0.01);

const output = { date: '2026-10-31', externalCalls: 0, checks: findings.length, findings,
  limitation: 'Imports stripped for isolated business-logic execution. Does not verify framework dispatch, real sessions, MongoDB, S3, or Stripe.' };
await fs.writeFile(new URL('./security-results.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
