// Isolated component checks with synthetic state. No browser or external services.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function component(relative, mocks) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true, target: ts.ScriptTarget.ES2020,
  }});
  const context = { exports: {}, require: name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    return { __esModule: true, default: () => null };
  }};
  vm.runInNewContext(outputText, context, { filename: relative });
  return context.exports.default;
}
function findButton(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'button') return node;
  for (const child of [node.props?.children].flat(Infinity)) {
    const button = findButton(child);
    if (button) return button;
  }
  return null;
}
const CartProduct = component('src/components/menu/CartProduct.js', {
  '@/components/AppContext': { cartProductPrice: () => 10 },
});
const button = findButton(CartProduct({ product: { name: 'Synthetic', image: '/logo.png' }, onRemove() {} }));
assert.ok(button);
assert.throws(() => button.props.onClick(), /index is not defined/);

let redirects = 0;
const ProfilePage = component('src/app/profile/page.js', {
  react: { useState: initial => [initial, () => {}], useEffect() {} },
  'next-auth/react': { useSession: () => ({ status: 'unauthenticated' }) },
  'next/navigation': { redirect() { redirects++; } },
});
assert.equal(ProfilePage(), 'Cargando...');
assert.equal(redirects, 0);
const output = { date: '2026-10-31', externalCalls: 0, checks: 2, findings: [
  { id: 'FUN-01', description: 'Cart remove button throws index is not defined', reproduced: true },
  { id: 'FUN-02', description: 'Unauthenticated profile stays loading instead of redirecting', reproduced: true },
], limitation: 'Components executed with synthetic dependencies and state; not an end-to-end browser test.' };
fs.writeFileSync(path.join(__dirname, 'functional-results.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
