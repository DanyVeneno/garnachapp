import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
async function loadComponent(relative, mocks = {}, globals = {}) {
  const source = await fs.readFile(new URL("../src/" + relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  } });
  const context = vm.createContext({ exports: {}, Event, ...globals, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === "react/jsx-runtime") return require(name);
    return { __esModule: true, default: () => null };
  } });
  new vm.Script(outputText, { filename: relative }).runInContext(context);
  return context.exports;
}
function find(node, type) {
  if (!node || typeof node !== "object") return null;
  if (node.type === type) return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = find(child, type);
    if (match) return match;
  }
  return null;
}
test("cart: remove button calls its explicit handler", async () => {
  let removed = 0;
  const { default: CartProduct } = await loadComponent("components/menu/CartProduct.js", {
    "@/components/AppContext": { cartProductPrice: () => 10 },
  });
  const button = find(CartProduct({ product: { image: "/logo.png", name: "Synthetic" }, onRemove: () => removed++ }), "button");
  assert.ok(button);
  button.props.onClick();
  assert.equal(removed, 1);
});
test("profile: anonymous state redirects instead of remaining in loading", async () => {
  let destination;
  const { default: ProfilePage } = await loadComponent("app/profile/page.js", {
    react: { useState: value => [value, () => {}], useEffect() {} },
    "next-auth/react": { useSession: () => ({ status: "unauthenticated" }) },
    "next/navigation": { redirect: path => { destination = path; return "redirect"; } },
  });
  assert.equal(ProfilePage(), "redirect");
  assert.equal(destination, "/login");
});
test("cart: corrupted browser storage recovers and products persist correctly", async () => {
  const storage = new Map([["cart", "{invalid"]]);
  const events = new EventTarget();
  const window = { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };
  const { AppProvider } = await loadComponent("components/AppContext.js", {
    react: { createContext: () => ({ Provider: "CartProvider" }), useMemo: fn => fn(), useCallback: fn => fn, useSyncExternalStore: (_, snapshot) => snapshot() },
    "next-auth/react": { SessionProvider: "SessionProvider" },
    "react-hot-toast": { __esModule: true, default: { success() {} } },
  }, { window });
  const context = () => find(AppProvider({ children: null }), "CartProvider").props.value;
  assert.equal(context().cartProducts.length, 0);
  context().addToCart({ _id: "synthetic", basePrice: 10 });
  context().addToCart({ _id: "synthetic", basePrice: 10 });
  assert.equal(context().cartProducts.length, 2);
  context().removeCartProduct(0);
  assert.equal(context().cartProducts.length, 1);
  context().clearCart();
  assert.equal(storage.get("cart"), "[]");
});
