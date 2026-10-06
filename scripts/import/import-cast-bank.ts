/**
 * Imports CAST/epsoprep_export_png/deduped markdown into app JSON + public assets.
 * Run: npx tsx scripts/import/import-cast-bank.ts
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DEDUPED = join(ROOT, 'CAST', 'epsoprep_export_png', 'deduped');
const ASSETS_SRC = join(ROOT, 'CAST', 'epsoprep_export_png', 'assets');
const PUBLIC_ASSETS = join(ROOT, 'public', 'cast-assets');
const OUT_DIR = join(ROOT, 'src', 'data', 'questions');

type Difficulty = 1 | 2 | 3 | 4 | 5;

type BankType = 'verbal' | 'numerical' | 'abstract' | 'digital' | 'eu';

interface ParsedBlock {
  number: string;
  body: string;
}

interface BaseOut {
  id: string;
  type: BankType;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  explanation: string;
  correctAnswer: number;
  source: 'cast-epsoprep';
  language: 'en';
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function splitQuestions(markdown: string): ParsedBlock[] {
  const text = markdown.replace(/\r\n/g, '\n');
  return text
    .split(/^## Pregunta /m)
    .slice(1)
    .map((chunk) => {
      const i = chunk.indexOf('\n');
      return { number: chunk.slice(0, i).trim(), body: chunk.slice(i + 1) };
    });
}

function section(body: string, heading: string): string {
  const pattern = new RegExp(
    `### ${heading}\\n\\n([\\s\\S]*?)(?=\\n### |\\n---|\\n## Pregunta |$)`,
  );
  return body.match(pattern)?.[1]?.trim() ?? '';
}

function parseOptions(optionsBlock: string): string[] {
  const lines = optionsBlock.split('\n').map((l) => l.trim()).filter(Boolean);
  const opts: string[] = [];
  for (const line of lines) {
    const m = line.match(/^-\s+\*\*([A-E])\.\*\*\s+(.*)$/);
    if (m) opts.push(m[2].trim());
  }
  return opts;
}

function parseCorrectLetter(answerBlock: string): number | null {
  const m = answerBlock.match(/\*\*([A-E])\*\*/);
  if (!m) return null;
  return m[1].charCodeAt(0) - 65;
}

function extractImages(body: string): string[] {
  return [...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1].trim());
}

function difficultyFromSeed(seed: string): Difficulty {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 5) + 1) as Difficulty;
}

function contentKey(stem: string, options: string[], answer: number, images: string[] = []): string {
  // Abstract stems are often identical; uniqueness must include image paths.
  // Same image may back several questions only if stem/options/answer differ.
  return normalize(`${stem} ${options.join(' ')} ${answer} ${images.join(' ')}`);
}

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function resolveAsset(markdownRel: string): { abs: string; publicUrl: string } | null {
  // markdown: ../assets/abstracto/foo.png
  const cleaned = markdownRel.replace(/^\.\.\//, '').replace(/^assets\//, '');
  const abs = join(ASSETS_SRC, cleaned);
  if (!existsSync(abs)) return null;
  const publicUrl = `/cast-assets/${cleaned.replace(/\\/g, '/')}`;
  return { abs, publicUrl };
}

function copyAsset(abs: string, publicUrl: string) {
  const dest = join(ROOT, 'public', publicUrl.replace(/^\//, ''));
  ensureDir(dirname(dest));
  if (!existsSync(dest)) copyFileSync(abs, dest);
}

function splitVerbalStem(stem: string): { passage: string; question: string } {
  const markers = [
    'Which of the following statements is correct?',
    'Which of the following statements is true?',
    'Which of the following is correct?',
    'Which one of the following statements is correct?',
  ];
  for (const marker of markers) {
    const idx = stem.lastIndexOf(marker);
    if (idx !== -1) {
      return {
        passage: stem.slice(0, idx).trim(),
        question: stem.slice(idx).trim(),
      };
    }
  }
  const parts = stem.trim().split(/\n\n+/);
  if (parts.length >= 2) {
    return {
      passage: parts.slice(0, -1).join('\n\n').trim(),
      question: parts[parts.length - 1].trim(),
    };
  }
  return { passage: stem.trim(), question: 'Which of the following statements is correct?' };
}

function importFile(
  file: string,
  type: BankType,
  category: string,
): { kept: number; skippedDup: number; skippedBad: number; questions: unknown[] } {
  const markdown = readFileSync(join(DEDUPED, file), 'utf8');
  const blocks = splitQuestions(markdown);
  const seen = new Set<string>();
  const questions: unknown[] = [];
  let skippedDup = 0;
  let skippedBad = 0;

  for (const block of blocks) {
    const stem = section(block.body, 'Enunciado');
    const optionsBlock = section(block.body, 'Opciones disponibles');
    const answerBlock = section(block.body, 'Respuesta y explicacion');
    const options = parseOptions(optionsBlock);
    const correctAnswer = parseCorrectLetter(answerBlock);

    if (
      !stem ||
      /No se pudo cargar esta revision/i.test(stem) ||
      options.length < 2 ||
      correctAnswer === null ||
      correctAnswer >= options.length
    ) {
      skippedBad++;
      continue;
    }

    const images = extractImages(block.body);
    const imageUrls: string[] = [];
    for (const img of images) {
      const resolved = resolveAsset(img);
      if (!resolved) continue;
      copyAsset(resolved.abs, resolved.publicUrl);
      imageUrls.push(resolved.publicUrl);
    }

    // Numerical without chart is not usable
    if (type === 'numerical' && imageUrls.length === 0) {
      skippedBad++;
      continue;
    }
    if (type === 'abstract' && imageUrls.length === 0) {
      skippedBad++;
      continue;
    }

    const key = contentKey(stem, options, correctAnswer, imageUrls);
    if (seen.has(key)) {
      skippedDup++;
      continue;
    }
    seen.add(key);

    const idSeed = createHash('sha1').update(`${type}:${key}`).digest('hex').slice(0, 10);
    const base: BaseOut = {
      id: `cast-${type}-${idSeed}`,
      type,
      difficulty: difficultyFromSeed(key),
      category,
      tags: ['cast', 'epsoprep', type],
      explanation: answerBlock.replace(/^La respuesta correcta es la \*\*[A-E]\*\*:[^\n]*\n*/i, '').trim() ||
        answerBlock,
      correctAnswer,
      source: 'cast-epsoprep',
      language: 'en',
    };

    if (type === 'verbal') {
      const { passage, question } = splitVerbalStem(stem);
      questions.push({
        ...base,
        passage,
        question,
        options,
      });
    } else if (type === 'numerical') {
      questions.push({
        ...base,
        question: stem,
        options,
        imageUrl: imageUrls[0],
        dataTable: { headers: [], rows: [] },
      });
    } else if (type === 'abstract') {
      questions.push({
        ...base,
        prompt: stem,
        imageUrl: imageUrls[0],
        options: options.map((o, i) => (o.length <= 2 ? String.fromCharCode(65 + i) : o)),
        promptSvg: '',
        optionSvgs: [],
      });
    } else {
      // digital | eu
      questions.push({
        ...base,
        question: stem,
        options,
      });
    }
  }

  return { kept: questions.length, skippedDup, skippedBad, questions };
}

function writeJson(filename: string, questions: unknown[]) {
  ensureDir(OUT_DIR);
  const path = join(OUT_DIR, filename);
  writeFileSync(path, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${questions.length} → ${relative(ROOT, path)}`);
}

function main() {
  ensureDir(PUBLIC_ASSETS);

  const jobs: Array<{ file: string; type: BankType; category: string; out: string }> = [
    {
      file: 'Verbal_epsoprep.md',
      type: 'verbal',
      category: 'Verbal Reasoning',
      out: 'verbal.cast-import.json',
    },
    {
      file: 'Numerico_epsoprep.md',
      type: 'numerical',
      category: 'Numerical Reasoning',
      out: 'numerical.cast-import.json',
    },
    {
      file: 'Abstracto.md',
      type: 'abstract',
      category: 'Abstract Reasoning',
      out: 'abstract.cast-import.json',
    },
    {
      file: 'Digital.md',
      type: 'digital',
      category: 'Digital Skills',
      out: 'digital.cast-import.json',
    },
    {
      file: 'EU_Knowledge.md',
      type: 'eu',
      category: 'EU Knowledge',
      out: 'eu.cast-import.json',
    },
  ];

  const summary: Record<string, unknown>[] = [];

  for (const job of jobs) {
    const result = importFile(job.file, job.type, job.category);
    writeJson(job.out, result.questions);
    summary.push({
      file: job.file,
      type: job.type,
      kept: result.kept,
      skippedDup: result.skippedDup,
      skippedBad: result.skippedBad,
    });
  }

  const assetCount = countFiles(PUBLIC_ASSETS);
  writeFileSync(
    join(OUT_DIR, 'cast-import.summary.json'),
    `${JSON.stringify({ importedAt: new Date().toISOString(), assetsCopied: assetCount, banks: summary }, null, 2)}\n`,
  );
  console.log('\nImport summary:');
  console.table(summary);
  console.log(`Public assets files: ${assetCount}`);
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(p);
    else n += 1;
  }
  return n;
}

main();
