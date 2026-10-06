import fs from "node:fs";
import path from "node:path";

const SOURCE_DIR = "/home/m0k4/Documents/cyber/Ohara/CAST/epsoprep_export_png";
const OUTPUT_DIR = path.join(SOURCE_DIR, "formatted");

const FILES = [
  "Abstracto.md",
  "Numerico_epsoprep.md",
  "Verbal_epsoprep.md",
  "Digital.md",
  "EU_Knowledge.md",
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NOISE = new Set([
  "Question",
  "Show answers",
  "I got this wrong because",
  "›",
  "Video explanation",
]);

function compactLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitQuestions(markdown) {
  const title = markdown.match(/^# .+$/m)?.[0] || "# EPSOprep";
  const chunks = markdown.split(/^## Pregunta /m);
  return {
    title,
    questions: chunks.slice(1).map((chunk) => {
      const firstNewline = chunk.indexOf("\n");
      const number = chunk.slice(0, firstNewline).trim();
      return { number, body: chunk.slice(firstNewline + 1) };
    }),
  };
}

function extractMeta(body) {
  const source = body.match(/^Fuente: (.+)$/m)?.[1]?.trim() || "";
  const images = Array.from(body.matchAll(/^!\[[^\]]*\]\(([^)]+)\)$/gm)).map((match) => match[1]);
  const withoutMeta = body
    .replace(/^Fuente: .+$/gm, "")
    .replace(/^!\[[^\]]*\]\([^)]+\)$/gm, "");
  return { source, images, lines: compactLines(withoutMeta) };
}

function normalizeContentLines(lines) {
  return lines.filter((line) => {
    if (/^Question \d+$/i.test(line)) return false;
    if (NOISE.has(line)) return false;
    return true;
  });
}

function isMarker(line) {
  return line === "Correct answer" || line === "Explanation";
}

function parseVerbal(lines) {
  const firstExplanation = lines.indexOf("Explanation");
  if (firstExplanation === -1) return null;

  const groups = [];
  const firstOptionIndex = firstExplanation - 1;
  const groupStart = lines[firstOptionIndex - 1] === "Correct answer" ? firstOptionIndex - 1 : firstOptionIndex;
  const stem = lines.slice(0, groupStart).join("\n\n");
  let i = groupStart;

  while (i < lines.length) {
    let correct = false;
    if (lines[i] === "Correct answer") {
      correct = true;
      i += 1;
    }
    const option = lines[i];
    if (!option || option === "Explanation") break;
    i += 1;
    if (lines[i] !== "Explanation") break;
    i += 1;
    const explanation = [];
    while (i < lines.length && lines[i] !== "Correct answer") {
      if (i + 1 < lines.length && lines[i + 1] === "Explanation") break;
      explanation.push(lines[i]);
      i += 1;
    }
    groups.push({ option, correct, explanation: explanation.join("\n\n") });
  }

  if (groups.length < 2) return null;
  return { stem, options: groups, explanation: "" };
}

function looksLikeTailOption(line) {
  if (!line || isMarker(line) || NOISE.has(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  return line.length <= 260;
}

function splitTailOptions(lines, count) {
  const tailOptions = [];
  let end = lines.length;

  while (tailOptions.length < count && end > 0) {
    const candidate = lines[end - 1];
    if (!looksLikeTailOption(candidate)) break;
    tailOptions.unshift(candidate);
    end -= 1;
  }

  return {
    explanationLines: lines.slice(0, end),
    tailOptions,
  };
}

function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferCorrectOptionFromExplanation(options, explanation) {
  const normalizedExplanation = normalizeForMatch(explanation);
  if (!normalizedExplanation) return null;

  return options.find((option) => {
    const normalizedOption = normalizeForMatch(option);
    if (normalizedOption.length < 3 || normalizedOption.length > 80) return false;
    return normalizedExplanation.startsWith(normalizedOption);
  }) || null;
}

function parseSimple(lines, sourceFile = "") {
  const correctIndex = lines.indexOf("Correct answer");
  const explanationIndex = lines.indexOf("Explanation", correctIndex + 2);
  if (correctIndex === -1 || explanationIndex === -1 || correctIndex > explanationIndex) {
    return { stem: lines.join("\n\n"), options: [], explanation: "", correctOption: null };
  }

  const stem = lines[0] || "";
  const preOptions = lines.slice(1, correctIndex).filter((line) => !isMarker(line));
  const correctOption = lines[correctIndex + 1] || "";
  const midOptions = lines.slice(correctIndex + 2, explanationIndex).filter((line) => !isMarker(line));
  const afterExplanation = lines
    .slice(explanationIndex + 1)
    .filter((line) => !NOISE.has(line) && !isMarker(line));

  const minimumExpected = sourceFile.includes("EU_Knowledge") ? 4 : 5;
  const expectedCount = Math.max(minimumExpected, preOptions.length + 1 + midOptions.length);
  const tailNeeded = Math.max(0, expectedCount - preOptions.length - 1 - midOptions.length);
  const { explanationLines, tailOptions } = tailNeeded
    ? splitTailOptions(afterExplanation, tailNeeded)
    : { explanationLines: afterExplanation, tailOptions: [] };
  const options = [...preOptions, correctOption, ...midOptions, ...tailOptions];

  const uniqueOptions = [];
  for (const option of options) {
    if (!uniqueOptions.includes(option)) uniqueOptions.push(option);
  }

  const finalOptions = uniqueOptions;
  if (!finalOptions.includes(correctOption)) finalOptions.push(correctOption);

  const explanation = explanationLines.join("\n\n");
  const inferredCorrectOption = inferCorrectOptionFromExplanation(finalOptions, explanation);
  const finalCorrectOption = inferredCorrectOption || correctOption;

  return {
    stem,
    options: finalOptions.map((option) => ({ option, correct: option === finalCorrectOption, explanation: "" })),
    explanation,
  };
}

function parseQuestion(body, sourceFile) {
  const meta = extractMeta(body);
  const lines = normalizeContentLines(meta.lines);
  const parsed = sourceFile.includes("Verbal")
    ? parseVerbal(lines) || parseSimple(lines, sourceFile)
    : parseSimple(lines, sourceFile);
  return { ...meta, ...parsed };
}

function formatQuestion(question, parsed) {
  const correctIndex = parsed.options.findIndex((option) => option.correct);
  const correctLetter = correctIndex >= 0 ? LETTERS[correctIndex] : "?";
  const out = [`## Pregunta ${question.number}`, ""];

  if (parsed.source) {
    out.push(`Fuente: ${parsed.source}`, "");
  }

  out.push("### Enunciado", "");
  out.push(parsed.stem || "_No se pudo extraer el enunciado._", "");

  if (parsed.images.length) {
    out.push("### Imagen", "");
    for (const image of parsed.images) {
      out.push(`![Imagen pregunta](../${image})`, "");
    }
  }

  out.push("### Opciones disponibles", "");
  if (parsed.options.length) {
    parsed.options.forEach((entry, index) => {
      out.push(`- **${LETTERS[index]}.** ${entry.option}`);
    });
    out.push("");
  } else {
    out.push("_No se pudieron extraer opciones._", "");
  }

  out.push("---", "");
  out.push("### Respuesta y explicacion", "");
  if (correctIndex >= 0) {
    out.push(`La respuesta correcta es la **${correctLetter}**: ${parsed.options[correctIndex].option}`, "");
  } else {
    out.push("_No se pudo identificar la respuesta correcta._", "");
  }

  if (parsed.explanation) {
    out.push(parsed.explanation, "");
  }

  const optionExplanations = parsed.options.filter((entry) => entry.explanation);
  if (optionExplanations.length) {
    out.push("Detalle por opcion:", "");
    parsed.options.forEach((entry, index) => {
      if (entry.explanation) {
        out.push(`- **${LETTERS[index]}.** ${entry.explanation}`);
      }
    });
    out.push("");
  }

  return out.join("\n");
}

function formatFile(file) {
  const markdown = fs.readFileSync(path.join(SOURCE_DIR, file), "utf8");
  const { title, questions } = splitQuestions(markdown);
  const out = [title, "", "Formato reorganizado para estudio.", ""];
  for (const question of questions) {
    out.push(formatQuestion(question, parseQuestion(question.body, file)));
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, file), `${out.join("\n")}\n`);
}

for (const file of FILES) {
  const fullPath = path.join(SOURCE_DIR, file);
  if (fs.existsSync(fullPath)) formatFile(file);
}
