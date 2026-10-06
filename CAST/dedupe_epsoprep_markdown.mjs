import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_DIR = "/home/m0k4/Documents/cyber/Ohara/CAST/epsoprep_export_png/formatted";
const OUTPUT_DIR = "/home/m0k4/Documents/cyber/Ohara/CAST/epsoprep_export_png/deduped";

const FILES = [
  "Abstracto.md",
  "Numerico_epsoprep.md",
  "Verbal_epsoprep.md",
  "Digital.md",
  "EU_Knowledge.md",
];

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractSection(block, heading) {
  const pattern = new RegExp(`### ${heading}\\n\\n([\\s\\S]*?)(?=\\n### |\\n---|\\n## Pregunta |$)`);
  return block.match(pattern)?.[1]?.trim() || "";
}

function imageHash(markdownPath) {
  const fullPath = path.resolve(SOURCE_DIR, markdownPath);
  if (!fs.existsSync(fullPath)) return `missing:${markdownPath}`;
  return crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
}

function splitQuestions(markdown) {
  const title = markdown.match(/^# .+$/m)?.[0] || "# EPSOprep";
  return {
    title,
    questions: markdown.split(/^## Pregunta /m).slice(1).map((chunk) => {
      const firstNewline = chunk.indexOf("\n");
      return {
        number: chunk.slice(0, firstNewline).trim(),
        body: chunk.slice(firstNewline + 1).trimEnd(),
      };
    }),
  };
}

function questionKey(body) {
  const stem = extractSection(body, "Enunciado");
  if (/No se pudo cargar esta revision tras varios reintentos/i.test(stem)) return null;

  const options = extractSection(body, "Opciones disponibles");
  const answer = extractSection(body, "Respuesta y explicacion");
  const images = Array.from(body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))
    .map((match) => imageHash(match[1]))
    .sort()
    .join("|");

  return `${normalize(`${stem} ${options} ${answer}`)} images ${images}`;
}

function renumberQuestion(body, number) {
  return `## Pregunta ${number}\n\n${body.trim()}`;
}

function dedupeFile(file) {
  const sourcePath = path.join(SOURCE_DIR, file);
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const { title, questions } = splitQuestions(markdown);
  const seen = new Map();
  const kept = [];
  let failed = 0;
  let duplicates = 0;

  for (const question of questions) {
    const key = questionKey(question.body);
    if (!key) {
      failed += 1;
      continue;
    }
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.set(key, question.number);
    kept.push(question);
  }

  const output = [
    title,
    "",
    "Formato deduplicado para estudio.",
    "",
    ...kept.map((question, index) => renumberQuestion(question.body, index + 1)),
  ].join("\n\n");

  fs.writeFileSync(path.join(OUTPUT_DIR, file), `${output}\n`);
  return {
    file,
    total: questions.length,
    kept: kept.length,
    duplicates,
    failed,
  };
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const summary = FILES.filter((file) => fs.existsSync(path.join(SOURCE_DIR, file))).map(dedupeFile);
fs.writeFileSync(path.join(OUTPUT_DIR, "dedupe-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
