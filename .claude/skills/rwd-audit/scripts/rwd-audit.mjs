#!/usr/bin/env node
// Drives a headless Chrome over CDP and reports horizontal overflow per page and width.
// No dependencies: Node 22's global WebSocket talks to Chrome directly.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  if (at === -1) return fallback;
  const values = [];
  for (let i = at + 1; i < argv.length && !argv[i].startsWith("--"); i++) values.push(argv[i]);
  return values.length ? values : true;
};

const pages = flag("pages");
if (!pages || pages === true) {
  console.error("usage: rwd-audit.mjs --pages / /products [--widths 320 390] [--cookie <v>] [--cookie-name tamiya_admin_session] [--shots <dir>] [--base http://localhost:3000]");
  process.exit(2);
}
const widths = (flag("widths", ["320", "390", "430", "768", "1280"])).map(Number);
const cookie = flag("cookie");
const shots = flag("shots");
const base = (flag("base", ["http://localhost:3000"]))[0];
if (shots) mkdirSync(shots[0], { recursive: true });

const PORT = 9222;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function chromeReady() {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); return true; } catch { return false; }
}

// Reuse a debuggable Chrome if one is already up; otherwise start a throwaway one.
let child = null;
if (!(await chromeReady())) {
  const profile = join(tmpdir(), `rwd-audit-${process.pid}`);
  child = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--no-first-run", "about:blank"],
    { stdio: "ignore", detached: true });
  for (let i = 0; i < 30 && !(await chromeReady()); i++) await wait(500);
  if (!(await chromeReady())) { console.error("could not start Chrome on port 9222"); process.exit(2); }
}

const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
ws.onmessage = (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); } };
await new Promise((resolve) => (ws.onopen = resolve));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

await send("Network.enable");
await send("Page.enable");
if (cookie && cookie !== true) {
  // Admin pages need the admin session; the flag takes either, named or not.
  const name = flag("cookie-name", ["tamiya_customer_session"])[0];
  await send("Network.setCookie", { name, value: cookie[0], domain: "localhost", path: "/" });
}

// The deepest offender is the one to fix; its ancestors are only wide because of it.
const PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > vw + 1);
  const deepest = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
  return JSON.stringify({
    scrollWidth: document.documentElement.scrollWidth, vw,
    culprits: deepest.slice(0, 3).map((el) => el.tagName + "." + String(el.className).slice(0, 60) + " w=" + Math.round(el.getBoundingClientRect().width)),
  });
})()`;

// A column squeezed to a few characters wide reads as broken but never overflows, so it needs
// its own probe: real sentences rendered into a sliver of width.
const SQUEEZE = `(() => {
  const bad = [...document.querySelectorAll("p, h1, h2, h3, li, span, a, button")].filter((el) => {
    const text = (el.textContent || "").trim();
    if (text.length < 24 || el.children.length) return false;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return false;
    // Roughly: more than six lines for a sentence this short means it is wrapping per word.
    const lines = box.height / parseFloat(getComputedStyle(el).lineHeight || "20");
    return box.width < 120 && lines > 6;
  });
  return JSON.stringify(bad.slice(0, 3).map((el) => el.tagName + "." + String(el.className).slice(0, 50) + " w=" + Math.round(el.getBoundingClientRect().width)));
})()`;

let failures = 0;
for (const width of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width < 768 ? 844 : 1000, deviceScaleFactor: shots ? 2 : 1, mobile: width < 768 });
  for (const path of pages) {
    await send("Page.navigate", { url: base + path });
    await wait(3200);
    const result = JSON.parse(await evaluate(PROBE));
    const squeezed = JSON.parse(await evaluate(SQUEEZE));
    const bad = result.scrollWidth > result.vw + 1;
    if (bad || squeezed.length) failures++;
    const notes = [
      bad ? `OVERFLOW  ${result.culprits.join("  ")}` : "",
      squeezed.length ? `SQUEEZED  ${squeezed.join("  ")}` : "",
    ].filter(Boolean).join("   ");
    console.log(`${String(width).padStart(5)}px ${path.padEnd(24)} ${notes || "ok"}`);
    if (shots && shots !== true) {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(join(shots[0], `${path.replace(/\W+/g, "_") || "home"}-${width}.png`), Buffer.from(shot.data, "base64"));
    }
  }
}

console.log(failures === 0 ? "\nno overflow and no squeezed columns" : `\n${failures} page/width combination(s) need attention`);
ws.close();
if (child) { try { process.kill(-child.pid); } catch {} }
process.exit(failures === 0 ? 0 : 1);
