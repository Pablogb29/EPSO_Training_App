import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const COOKIE = process.env.EPSOPREP_SESSION_TOKEN;
const DEBUG_PORT = Number(process.env.EPSOPREP_DEBUG_PORT || 9224);
const USER_DATA_DIR = process.env.EPSOPREP_CHROME_PROFILE || `/tmp/epsoprep-export-profile-${process.pid}`;
const OUTPUT_DIR = process.env.EPSOPREP_OUTPUT_DIR || "/home/m0k4/Documents/cyber/Ohara/CAST/epsoprep_export";
const BASE_URL = "https://www.epsoprep.com";

const CATEGORIES = [
  {
    name: "Abstract Reasoning",
    file: "Abstracto.md",
    slug: "abstracto",
    pool: "/practice/UXVlc3Rpb25Qb29sOkRhUzFnTklwUTBiR01BamRKMjVHY1E=",
  },
  {
    name: "Numerical Reasoning",
    file: "Numerico_epsoprep.md",
    slug: "numerico",
    pool: "/practice/UXVlc3Rpb25Qb29sOlktM1BuMDdkbVUxd1dnamRnbDBUemc=",
  },
  {
    name: "Verbal Reasoning",
    file: "Verbal_epsoprep.md",
    slug: "verbal",
    pool: "/practice/UXVlc3Rpb25Qb29sOm5sREx0M1lEdUVKd1dRamRnbDBUemc=",
  },
  {
    name: "Digital Skills",
    file: "Digital.md",
    slug: "digital",
    pool: "/practice/UXVlc3Rpb25Qb29sOjVvdnY2Y1ZTbVU1d1hBamRnbDBUemc=",
  },
];

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
    `${BASE_URL}/dashboard`,
  ];
  return spawn("chromium", args, { stdio: ["ignore", "ignore", "pipe"] });
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

async function waitForLoad(cdp) {
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 15000);
    cdp.on("Page.loadEventFired", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function navigate(cdp, url, pattern = "Practice|Question|Results|Dashboard") {
  await cdp.call("Page.navigate", { url });
  await waitForLoad(cdp);
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const text = await evaluate(cdp, "document.body.innerText");
    if (new RegExp(pattern, "i").test(text)) return text;
    await sleep(400);
  }
  return evaluate(cdp, "document.body.innerText");
}

async function navigateReview(cdp, url) {
  const questionNumber = new URL(url).searchParams.get("q");
  const expectedQuestion = `Question ${questionNumber}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await cdp.call("Page.navigate", { url });
    await waitForLoad(cdp);
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const text = await evaluate(cdp, "document.body.innerText");
      if (text.includes(expectedQuestion) && /Explanation|Correct answer/i.test(text) && !/^Loading\.\.\.$/m.test(text)) {
        return text;
      }
      await sleep(600);
    }
  }
  throw new Error(`Review page did not finish loading: ${url}`);
}

async function setup(cdp) {
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
  await cdp.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1600,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

function absoluteUrl(href) {
  return href.startsWith("http") ? href : `${BASE_URL}${href}`;
}

async function collectResultLinks(cdp, category) {
  await navigate(cdp, absoluteUrl(category.pool), category.name);
  let previousCount = -1;
  for (let i = 0; i < 80; i += 1) {
    const count = await evaluate(
      cdp,
      `new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/results'))).size`
    );
    const clicked = await evaluate(
      cdp,
      `(() => {
        const button = Array.from(document.querySelectorAll('button')).find((b) => /load more/i.test(b.innerText) && !b.disabled);
        if (!button) return false;
        button.scrollIntoView({ block: 'center' });
        button.click();
        return true;
      })()`
    );
    if (!clicked || count === previousCount) {
      await sleep(1200);
      const finalCount = await evaluate(
        cdp,
        `new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/results'))).size`
      );
      if (!clicked || finalCount === count) break;
    }
    previousCount = count;
    await sleep(1400);
  }
  const links = await evaluate(
    cdp,
    `Array.from(new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/results'))))`
  );
  return links.map(absoluteUrl);
}

async function collectReviewLinks(cdp, resultUrl) {
  await navigate(cdp, resultUrl, "Question list|Results");
  const links = await evaluate(
    cdp,
    `Array.from(new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/review?q='))))`
  );
  return links.map(absoluteUrl);
}

function cleanReviewText(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const start = lines.findIndex((line) => /^Question \d+$/i.test(line));
  const endCandidates = ["Add Saved Note", "Previous", "Next", "EPSOprep provides"];
  let end = lines.length;
  for (const marker of endCandidates) {
    const index = lines.findIndex((line, i) => i > start && line === marker);
    if (index !== -1) end = Math.min(end, index);
  }
  return lines.slice(Math.max(0, start), end).join("\n\n");
}

async function captureScreenshot(cdp, filePath) {
  const result = await cdp.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
}

async function exportCategory(cdp, category) {
  const resultLinks = await collectResultLinks(cdp, category);
  const reviewLinks = [];
  for (const resultLink of resultLinks) {
    const links = await collectReviewLinks(cdp, resultLink);
    reviewLinks.push(...links);
    console.error(`${category.name}: ${reviewLinks.length} review links found`);
  }

  const uniqueReviewLinks = Array.from(new Set(reviewLinks));
  const assetDir = path.join(OUTPUT_DIR, "assets", category.slug);
  fs.mkdirSync(assetDir, { recursive: true });

  const sections = [
    `# ${category.name}`,
    "",
    `Exported from EPSOprep on ${new Date().toISOString().slice(0, 10)}.`,
    "",
    `Total review pages exported: ${uniqueReviewLinks.length}.`,
    "",
  ];

  for (let i = 0; i < uniqueReviewLinks.length; i += 1) {
    const reviewUrl = uniqueReviewLinks[i];
    const text = await navigateReview(cdp, reviewUrl);
    await sleep(500);
    const shotName = `${category.slug}-${String(i + 1).padStart(4, "0")}.png`;
    const shotPath = path.join(assetDir, shotName);
    await captureScreenshot(cdp, shotPath);
    sections.push(`## Pregunta ${i + 1}`);
    sections.push("");
    sections.push(`Fuente: ${reviewUrl}`);
    sections.push("");
    sections.push(`Captura: [${shotName}](assets/${category.slug}/${shotName})`);
    sections.push("");
    sections.push(cleanReviewText(text));
    sections.push("");
    console.error(`${category.name}: exported ${i + 1}/${uniqueReviewLinks.length}`);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, category.file), `${sections.join("\n")}\n`);
  return { category: category.name, attempts: resultLinks.length, questions: uniqueReviewLinks.length };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const chrome = await launch();
  try {
    const wsUrl = await waitForDevtools();
    const cdp = new Cdp(wsUrl);
    await setup(cdp);
    const summary = [];
    for (const category of CATEGORIES) {
      summary.push(await exportCategory(cdp, category));
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
    cdp.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
