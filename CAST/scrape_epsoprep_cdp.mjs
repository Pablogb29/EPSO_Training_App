import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

const COOKIE = process.env.EPSOPREP_SESSION_TOKEN;
const START_URL = process.env.EPSOPREP_START_URL || "https://www.epsoprep.com/dashboard";
const DEBUG_PORT = Number(process.env.EPSOPREP_DEBUG_PORT || 9223);
const USER_DATA_DIR = process.env.EPSOPREP_CHROME_PROFILE || `/tmp/epsoprep-cdp-profile-${process.pid}`;
const CHROME_LOG = process.env.EPSOPREP_CHROME_LOG || "/tmp/epsoprep-chromium.log";

if (!COOKIE) {
  console.error("Set EPSOPREP_SESSION_TOKEN with the Zen __Secure-authjs.session-token value.");
  process.exit(1);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function waitForDevtools() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chromium DevTools endpoint did not start.");
}

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method && this.events.has(msg.method)) {
        for (const handler of this.events.get(msg.method)) handler(msg.params);
      }
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, handler) {
    if (!this.events.has(method)) this.events.set(method, new Set());
    this.events.get(method).add(handler);
  }

  close() {
    this.ws.close();
  }
}

async function launch() {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    START_URL,
  ];
  const chrome = spawn("chromium", args, { stdio: ["ignore", "ignore", "pipe"] });
  fs.writeFileSync(CHROME_LOG, "");
  chrome.stderr.on("data", (chunk) => fs.appendFileSync(CHROME_LOG, chunk));
  return chrome;
}

async function waitForLoad(cdp) {
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 10000);
    cdp.on("Page.loadEventFired", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function waitForText(cdp, pattern, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await evaluate(cdp, "document.body.innerText");
    if (new RegExp(pattern, "i").test(text)) return text;
    await sleep(500);
  }
  return evaluate(cdp, "document.body.innerText");
}

async function main() {
  const chrome = await launch();
  try {
    const wsUrl = await waitForDevtools();
    const cdp = new Cdp(wsUrl);
    await cdp.open();
    await cdp.call("Page.enable");
    await cdp.call("Runtime.enable");
    await cdp.call("Network.enable");
    await cdp.call("Network.setCookie", {
      name: "__Secure-authjs.session-token",
      value: COOKIE,
      domain: "www.epsoprep.com",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    });
    await cdp.call("Page.navigate", { url: START_URL });
    await waitForLoad(cdp);
    await waitForText(cdp, "Question|Practice|Dashboard|Abstract|Numerical|Verbal", 25000);
    const body = await evaluate(cdp, "document.body.innerText");
    const hrefs = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(Boolean)`
    );
    const images = await evaluate(
      cdp,
      `Array.from(document.images).map((img) => ({
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        width: img.naturalWidth,
        height: img.naturalHeight,
        text: img.closest('figure,div,li,section')?.innerText || ""
      })).filter((img) => img.src)`
    );
    const svgs = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('svg')).map((svg) => ({
        text: svg.closest('figure,div,li,section')?.innerText || "",
        html: svg.outerHTML.slice(0, 2000)
      }))`
    );
    const canvases = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('canvas')).map((canvas) => ({
        text: canvas.closest('figure,div,li,section')?.innerText || "",
        width: canvas.width,
        height: canvas.height
      }))`
    );
    const buttons = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('button')).map((button) => button.innerText).filter(Boolean)`
    );
    const dataImages = await evaluate(
      cdp,
      `(() => {
        const out = [];
        const re = /data:image\\/(?:png|jpeg|webp|svg\\+xml);base64,[A-Za-z0-9+/=]+/g;
        for (const el of document.querySelectorAll('*')) {
          for (const attr of el.getAttributeNames()) {
            const value = el.getAttribute(attr) || '';
            const matches = value.match(re) || [];
            for (const match of matches) out.push({ tag: el.tagName, attr, length: match.length, text: el.closest('figure,div,li,section')?.innerText?.slice(0, 120) || '' });
          }
          const style = getComputedStyle(el).backgroundImage || '';
          const matches = style.match(re) || [];
          for (const match of matches) out.push({ tag: el.tagName, attr: 'computed.backgroundImage', length: match.length, text: el.closest('figure,div,li,section')?.innerText?.slice(0, 120) || '' });
        }
        const htmlMatches = document.documentElement.outerHTML.match(re) || [];
        return { nodes: out, htmlMatchLengths: htmlMatches.map((m) => m.length).slice(0, 20), htmlMatchCount: htmlMatches.length };
      })()`
    );
    console.log(JSON.stringify({ url: START_URL, text: body, hrefs, images, svgs, canvases, buttons, dataImages }, null, 2));
    cdp.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
