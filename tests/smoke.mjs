// Exercise the production build over HTTP with synthetic credentials only.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { once } from "node:events";
import net from "node:net";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const socket = net.createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    MONGO_URL: "mongodb://127.0.0.1:1/audit?serverSelectionTimeoutMS=500&connectTimeoutMS=500",
    NEXTAUTH_URL: base, SECRET: "synthetic-local-smoke-test-secret-at-least-32-characters",
    GOOGLE_CLIENT_ID: "synthetic", GOOGLE_CLIENT_SECRET: "synthetic",
    STRIPE_SK: "sk_test_synthetic", STRIPE_SIGN_SECRET: "whsec_synthetic",
    MY_AWS_ACCESS_KEY: "synthetic", MY_AWS_SECRET_KEY: "synthetic",
  },
});
let logs = "";
server.stdout.on("data", chunk => { logs += chunk; });
server.stderr.on("data", chunk => { logs += chunk; });
server.on("error", error => { logs += error.message; });
const exited = once(server, "exit");
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error("Production server exited: " + logs);
    try { if ((await fetch(base, { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, "production server did not start: " + logs);
  const checks = [
    ["/", 200], ["/menu", 200], ["/cart", 200],
    ["/api/auth/providers", 200], ["/api/auth/session", 200],
    ["/api/profile", 401], ["/api/orders", 401],
    ["/api/profile", 401, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ admin: true }) }],
    ["/api/upload", 401, { method: "POST" }],
    ["/api/checkout", 401, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }],
    ["/api/register", 400, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "test@example.invalid", password: "x" }) }],
  ];
  for (const [url, expected, options] of checks) {
    const response = await fetch(base + url, { ...options, signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    assert.equal(response.status, expected, `${url}: ${body.slice(0, 200)}`);
    if (url === "/api/auth/providers") {
      const providers = JSON.parse(body);
      assert.ok(providers.google && providers.credentials);
    }
    console.log(`${options?.method || "GET"} ${url}: ${response.status}`);
  }
  assert.doesNotMatch(logs, /MongoServerSelectionError|MongooseServerSelectionError/);
  console.log(`${checks.length} HTTP checks passed with synthetic credentials.`);
} finally {
  if (server.exitCode === null) server.kill();
  await exited;
}
