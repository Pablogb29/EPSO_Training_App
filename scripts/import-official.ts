/**
 * Placeholder script for importing official EPSO sample materials.
 * Reads JSON files from imports/official/ and validates structure.
 * Does NOT download or scrape official content.
 */

import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMPORT_DIR = join(__dirname, '..', 'imports', 'official');

interface ImportValidationResult {
  file: string;
  valid: boolean;
  questionCount?: number;
  errors?: string[];
}

function validateQuestion(obj: unknown): string[] {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    return ['Root must be an object'];
  }
  const q = obj as Record<string, unknown>;
  const required = ['id', 'type', 'difficulty', 'category', 'tags', 'explanation', 'correctAnswer'];
  for (const field of required) {
    if (!(field in q)) errors.push(`Missing field: ${field}`);
  }
  if (q.type && !['verbal', 'numerical', 'abstract', 'technical'].includes(q.type as string)) {
    errors.push(`Invalid type: ${q.type}`);
  }
  if (q.difficulty && (typeof q.difficulty !== 'number' || q.difficulty < 1 || q.difficulty > 5)) {
    errors.push('difficulty must be 1-5');
  }
  if (q.type === 'verbal') {
    if (!q.passage) errors.push('verbal: missing passage');
    if (!q.question) errors.push('verbal: missing question');
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push('verbal: options must be an array of 4 strings');
    }
    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
      errors.push('verbal: correctAnswer must be 0-3');
    }
  }
  return errors;
}

async function validateJsonFile(filePath: string): Promise<ImportValidationResult> {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(items)) {
      return { file: fileName, valid: false, errors: ['Expected array or { questions: [] }'] };
    }
    const allErrors: string[] = [];
    items.forEach((item, i) => {
      const errs = validateQuestion(item);
      if (errs.length) allErrors.push(`[${i}]: ${errs.join(', ')}`);
    });
    if (allErrors.length) {
      return { file: fileName, valid: false, errors: allErrors };
    }
    return { file: fileName, valid: true, questionCount: items.length };
  } catch (e) {
    return { file: fileName, valid: false, errors: [(e as Error).message] };
  }
}

async function main() {
  console.log('EPSO Trainer — Official Import Validator\n');
  console.log(`Scanning: ${IMPORT_DIR}\n`);

  let files: string[];
  try {
    files = await readdir(IMPORT_DIR);
  } catch {
    console.log('Directory imports/official/ not found or empty.');
    console.log('Add your own JSON files following the question schema documented in README.md.');
    return;
  }

  const jsonFiles = files.filter((f) => extname(f).toLowerCase() === '.json');
  if (jsonFiles.length === 0) {
    console.log('No JSON files found in imports/official/.');
    console.log('You can add PDFs, screenshots, or notes — only .json files are validated here.');
    console.log('Future versions will merge valid imports into the question bank.');
    return;
  }

  for (const file of jsonFiles) {
    const result = await validateJsonFile(join(IMPORT_DIR, file));
    if (result.valid) {
      console.log(`✓ ${result.file} — ${result.questionCount} questions valid`);
    } else {
      console.log(`✗ ${result.file}`);
      result.errors?.forEach((e) => console.log(`  ${e}`));
    }
  }

  console.log('\nImport pipeline not yet connected to the app. Validation only.');
}

main();
