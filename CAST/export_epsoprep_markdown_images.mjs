import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const COOKIE = process.env.EPSOPREP_SESSION_TOKEN;
const DEBUG_PORT = Number(process.env.EPSOPREP_DEBUG_PORT || 9225);
const USER_DATA_DIR = process.env.EPSOPREP_CHROME_PROFILE || `/tmp/epsoprep-export-images-profile-${process.pid}`;
const OUTPUT_DIR = process.env.EPSOPREP_OUTPUT_DIR || "/home/m0k4/Documents/cyber/Ohara/CAST/epsoprep_export_png";
const COUNTS_ONLY = process.env.EPSOPREP_COUNTS_ONLY === "1";
const RESUME = process.env.EPSOPREP_RESUME === "1";
const CATEGORY_FILTER = (process.env.EPSOPREP_CATEGORIES || "")
  .split(",")
  .map((category) => category.trim().toLowerCase())
  .filter(Boolean);
const BASE_URL = "https://www.epsoprep.com";
const LOAD_MORE_ATTEMPTS_ACTION = "60639dcccf340ee44e76eadcbf19a139291cb2f3a0";
const CDP_CALL_TIMEOUT_MS = Number(process.env.EPSOPREP_CDP_TIMEOUT_MS || 25000);
const FETCH_TIMEOUT_MS = Number(process.env.EPSOPREP_FETCH_TIMEOUT_MS || 25000);
const REVIEW_ATTEMPTS = Number(process.env.EPSOPREP_REVIEW_ATTEMPTS || 5);
const REVIEW_TIMEOUT_MS = Number(process.env.EPSOPREP_REVIEW_TIMEOUT_MS || 60000);

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
  {
    name: "EU Knowledge",
    file: "EU_Knowledge.md",
    slug: "eu_knowledge",
    pool: "/practice/UXVlc3Rpb25Qb29sOnF6N2otajlsajBwd1d3amRnbDBUemc=",
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
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP call timed out after ${CDP_CALL_TIMEOUT_MS}ms: ${method}`));
      }, CDP_CALL_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
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
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const text = await evaluate(cdp, "document.body.innerText");
    if (new RegExp(pattern, "i").test(text)) return text;
    await sleep(500);
  }
  return evaluate(cdp, "document.body.innerText");
}

async function navigateReview(cdp, url) {
  const questionNumber = new URL(url).searchParams.get("q");
  const expectedQuestion = `Question ${questionNumber}`;
  for (let attempt = 0; attempt < REVIEW_ATTEMPTS; attempt += 1) {
    await cdp.call("Page.navigate", { url });
    await waitForLoad(cdp);
    const deadline = Date.now() + REVIEW_TIMEOUT_MS;
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
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

function absoluteUrl(href) {
  return href.startsWith("http") ? href : `${BASE_URL}${href}`;
}

async function collectResultLinks(cdp, category) {
  await navigate(cdp, absoluteUrl(category.pool), category.name);
  let stableClicks = 0;
  let previousAnchorCount = -1;

  for (let i = 0; i < 120; i += 1) {
    const before = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('a[href]')).filter(a => a.getAttribute('href')?.includes('/results')).length`
    );
    const clicked = await evaluate(
      cdp,
      `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find((b) => /load more/i.test(b.innerText) && !b.disabled && b.offsetParent !== null);
        if (!button) return false;
        button.scrollIntoView({ block: 'center' });
        button.click();
        return true;
      })()`
    );
    if (!clicked) break;

    await sleep(2500);
    const after = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('a[href]')).filter(a => a.getAttribute('href')?.includes('/results')).length`
    );
    if (after === previousAnchorCount || after === before) stableClicks += 1;
    else stableClicks = 0;
    previousAnchorCount = after;
    if (stableClicks >= 8) break;
  }

  const links = await evaluate(
    cdp,
    `Array.from(new Set(Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => h && h.includes('/results'))))`
  );
  return links.map(absoluteUrl);
}

function parseServerActionPayload(text) {
  const line = text.split(/\n/).find((entry) => /^1:/.test(entry));
  if (!line) throw new Error(`Unexpected server action response: ${text.slice(0, 200)}`);
  return JSON.parse(line.slice(2));
}

async function loadAttemptsBatch(category, offset) {
  const response = await fetchWithTimeout(absoluteUrl(category.pool), {
    method: "POST",
    headers: {
      Cookie: `__Secure-authjs.session-token=${COOKIE}`,
      "next-action": LOAD_MORE_ATTEMPTS_ACTION,
      Accept: "text/x-component",
      "Content-Type": "text/plain;charset=UTF-8",
      Referer: absoluteUrl(category.pool),
      "User-Agent": "Mozilla/5.0 EPSOprep personal exporter",
    },
    body: JSON.stringify([offset, category.pool.replace("/practice/", "")]),
  });
  if (!response.ok) throw new Error(`Attempt batch failed ${response.status}: ${category.name} offset ${offset}`);
  return parseServerActionPayload(await response.text());
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function collectAttempts(category) {
  const attempts = [];
  let totalCount = null;
  for (let offset = 0; offset < 1000; ) {
    const payload = await loadAttemptsBatch(category, offset);
    totalCount = payload.totalCount;
    attempts.push(...payload.items);
    console.error(`${category.name}: ${attempts.length}/${totalCount} attempts found`);
    if (!payload.items.length || attempts.length >= totalCount) break;
    offset += payload.items.length;
  }
  return attempts;
}

function reviewLinksForAttempt(attempt) {
  const languageCode = attempt.languageCode === "gb" ? "en" : attempt.languageCode || "en";
  return Array.from({ length: attempt.totalItemsCount }, (_, index) =>
    `${BASE_URL}/practice/attempt/${languageCode}/${attempt.id}/review?q=${index + 1}`
  );
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

async function getQuestionImages(cdp) {
  return evaluate(
    cdp,
    `(() => {
      const bad = /logo|profile|facebook|caret|burger|avatar|icon/i;
      const imgs = Array.from(document.images)
        .map((img) => ({
          src: img.currentSrc || img.src,
          alt: img.alt || "",
          width: img.naturalWidth || img.width || 0,
          height: img.naturalHeight || img.height || 0,
          text: img.closest('figure,div,li,section')?.innerText?.slice(0, 300) || ""
        }))
        .filter((img) => img.src && img.width >= 120 && img.height >= 80)
        .filter((img) => !bad.test(img.alt) && !bad.test(img.src));

      const dataUris = [];
      const re = /data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g;
      for (const match of document.documentElement.outerHTML.matchAll(re)) {
        if (match[0].length > 1000) dataUris.push({ src: match[0], alt: "embedded data image", width: 0, height: 0, text: "" });
      }
      return [...imgs, ...dataUris];
    })()`
  );
}

function extensionFromContentType(contentType) {
  if (/jpeg|jpg/i.test(contentType)) return "jpg";
  if (/webp/i.test(contentType)) return "webp";
  if (/svg/i.test(contentType)) return "svg";
  return "png";
}

async function saveImage(image, outBase) {
  if (image.src.startsWith("data:image/")) {
    const [meta, encoded] = image.src.split(",", 2);
    const ext = extensionFromContentType(meta);
    const filename = `${outBase}.${ext}`;
    fs.writeFileSync(filename, Buffer.from(encoded, "base64"));
    return filename;
  }

  const response = await fetchWithTimeout(image.src, {
    headers: {
      Cookie: image.src.startsWith(BASE_URL) ? `__Secure-authjs.session-token=${COOKIE}` : "",
      Referer: BASE_URL,
      "User-Agent": "Mozilla/5.0 EPSOprep personal exporter",
    },
  });
  if (!response.ok) throw new Error(`Image download failed ${response.status}: ${image.src}`);
  const ext = extensionFromContentType(response.headers.get("content-type") || "");
  const filename = `${outBase}.${ext}`;
  fs.writeFileSync(filename, Buffer.from(await response.arrayBuffer()));
  return filename;
}

async function exportCategory(cdp, category) {
  const attempts = await collectAttempts(category);
  const reviewLinks = attempts.flatMap(reviewLinksForAttempt);
  const uniqueReviewLinks = Array.from(new Set(reviewLinks));
  if (COUNTS_ONLY) {
    return {
      category: category.name,
      attempts: attempts.length,
      candidateReviewPages: uniqueReviewLinks.length,
    };
  }

  const assetDir = path.join(OUTPUT_DIR, "assets", category.slug);
  fs.mkdirSync(assetDir, { recursive: true });

  const sections = [
    `# ${category.name}`,
    "",
    `Exported from EPSOprep on ${new Date().toISOString().slice(0, 10)}.`,
    "",
    `Candidate review pages found: ${uniqueReviewLinks.length}.`,
    "",
  ];

  let exported = 0;
  let skipped = 0;
  const outputFile = path.join(OUTPUT_DIR, category.file);
  if (RESUME && fs.existsSync(outputFile)) {
    const existing = fs.readFileSync(outputFile, "utf8").trimEnd();
    const existingCount = (existing.match(/^## Pregunta /gm) || []).length;
    if (existingCount > 0 && existingCount < uniqueReviewLinks.length) {
      sections.length = 0;
      sections.push(...existing.split("\n"));
      sections.push("");
      exported = existingCount;
      skipped = (existing.match(/No se pudo cargar esta revision tras varios reintentos/g) || []).length;
      console.error(`${category.name}: resuming from ${exported + 1}/${uniqueReviewLinks.length}`);
    }
  }

  for (let i = exported; i < uniqueReviewLinks.length; i += 1) {
    const reviewUrl = uniqueReviewLinks[i];
    let text;
    exported += 1;
    sections.push(`## Pregunta ${exported}`);
    sections.push("");
    sections.push(`Fuente: ${reviewUrl}`);
    sections.push("");

    try {
      text = await navigateReview(cdp, reviewUrl);
    } catch (error) {
      skipped += 1;
      console.error(`${category.name}: skipped inaccessible review ${i + 1}/${uniqueReviewLinks.length}: ${reviewUrl}`);
      sections.push(`No se pudo cargar esta revision tras varios reintentos.`);
      sections.push("");
      fs.writeFileSync(outputFile, `${sections.join("\n")}\n`);
      continue;
    }
    await sleep(500);
    const images = await getQuestionImages(cdp);
    const savedImages = [];
    for (let j = 0; j < images.length; j += 1) {
      const outBase = path.join(assetDir, `${category.slug}-${String(exported).padStart(4, "0")}-${String(j + 1).padStart(2, "0")}`);
      try {
        const filename = await saveImage(images[j], outBase);
        savedImages.push(path.relative(OUTPUT_DIR, filename));
      } catch (error) {
        console.error(`${category.name}: skipped image ${j + 1} for review ${i + 1}/${uniqueReviewLinks.length}: ${error.message}`);
      }
    }

    for (const savedImage of savedImages) {
      sections.push(`![Imagen pregunta](${savedImage})`);
      sections.push("");
    }
    sections.push(cleanReviewText(text));
    sections.push("");
    fs.writeFileSync(outputFile, `${sections.join("\n")}\n`);
    console.error(`${category.name}: exported ${exported}/${uniqueReviewLinks.length} (${savedImages.length} images)`);
  }

  return { category: category.name, attempts: attempts.length, candidateReviewPages: uniqueReviewLinks.length, questions: exported, skipped };
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
      if (
        CATEGORY_FILTER.length &&
        !CATEGORY_FILTER.includes(category.slug.toLowerCase()) &&
        !CATEGORY_FILTER.includes(category.name.toLowerCase()) &&
        !CATEGORY_FILTER.some((filter) => category.name.toLowerCase().includes(filter))
      ) {
        continue;
      }
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
