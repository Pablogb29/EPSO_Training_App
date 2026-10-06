import { spawn } from "node:child_process";
import http from "node:http";
import { setTimeout as sleep } from "node:timers/promises";

const COOKIE = process.env.EPSOPREP_SESSION_TOKEN;
const START_URL = process.env.EPSOPREP_START_URL;
const DEBUG_PORT = Number(process.env.EPSOPREP_DEBUG_PORT || 9227);
const USER_DATA_DIR = `/tmp/epsoprep-inspect-review-${process.pid}`;

if (!COOKIE || !START_URL) {
  console.error("Set EPSOPREP_SESSION_TOKEN and EPSOPREP_START_URL.");
  process.exit(1);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(JSON.parse(body)));
    }).on("error", reject);
  });
}

async function waitForDevtools() {
  for (let i = 0; i < 75; i += 1) {
    try {
      const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("DevTools did not start.");
}

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
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
      }
    });
  }
  call(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
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

async function main() {
  const chrome = spawn("chromium", [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    START_URL,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    const cdp = new Cdp(await waitForDevtools());
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
    await sleep(4000);
    const result = await evaluate(cdp, `(() => {
      const byText = Array.from(document.querySelectorAll('button, label, div, p, span'))
        .map((el) => ({
          tag: el.tagName,
          className: el.className || '',
          role: el.getAttribute('role') || '',
          aria: el.getAttribute('aria-label') || '',
          text: el.innerText?.trim() || '',
          html: el.outerHTML.slice(0, 600)
        }))
        .filter((x) => x.text && (
          /Correct answer|Explanation|Java|Python|SQL|C\\+\\+|HTML|Question 2|database language/i.test(x.text)
        ));
      return { body: document.body.innerText, nodes: byText };
    })()`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
