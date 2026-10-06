import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_DIR = join(__dirname, '..', '..', 'src', 'data', 'questions');

export function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
}

export function writeQuestions(filename: string, questions: unknown[]) {
  ensureOutputDir();
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, JSON.stringify(questions, null, 2) + '\n', 'utf-8');
  console.log(`Generated ${questions.length} questions → ${path}`);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
