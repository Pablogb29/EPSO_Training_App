import type { Question, QuestionType } from '@/types/question';

// Active bank: CAST EPSOprep import (unique questions).
import verbalCast from './questions/verbal.cast-import.json';
import numericalCast from './questions/numerical.cast-import.json';
import abstractCast from './questions/abstract.cast-import.json';
import digitalCast from './questions/digital.cast-import.json';
import euCast from './questions/eu.cast-import.json';

// Technical (cyber) has no CAST equivalent — keep curated generated bank as extra module.
import technicalSample from './questions/technical.sample.json';
import technicalGenerated from './questions/technical.generated.json';
import technicalCastGenerated from './questions/technical.cast.generated.json';
import technicalExpansionGenerated from './questions/technical.expansion.generated.json';

/**
 * Archived / inactive banks (kept on disk, NOT loaded into the UI):
 * - *.sample.json, *.official.json, *.generated.json
 * - *.official-style.generated.json, *.cast.generated.json, *.expansion.generated.json
 * - verbal/numerical/abstract samples & generators
 * Re-enable by importing here if needed.
 */

function questionContentKey(q: Question): string {
  if (q.type === 'verbal') return `${q.passage}|${q.question}|${q.options.join('|')}`;
  if (q.type === 'numerical') {
    return `${q.question}|${q.imageUrl ?? ''}|${JSON.stringify(q.dataTable ?? null)}|${q.options.join('|')}`;
  }
  if (q.type === 'abstract') {
    return `${q.prompt}|${q.imageUrl ?? ''}|${q.promptSvg ?? ''}|${q.options.join('|')}`;
  }
  return `${q.question}|${q.options.join('|')}`;
}

/** Elimina duplicados por id y por contenido. */
export function dedupeQuestions(questions: Question[]): Question[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: Question[] = [];

  for (const q of questions) {
    if (seenIds.has(q.id)) continue;
    const contentKey = questionContentKey(q);
    if (seenContent.has(contentKey)) continue;
    seenIds.add(q.id);
    seenContent.add(contentKey);
    result.push(q);
  }

  return result;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const questionBank: Record<QuestionType, Question[]> = {
  verbal: dedupeQuestions(verbalCast as Question[]),
  numerical: dedupeQuestions(numericalCast as Question[]),
  abstract: dedupeQuestions(abstractCast as Question[]),
  digital: dedupeQuestions(digitalCast as Question[]),
  eu: dedupeQuestions(euCast as Question[]),
  technical: dedupeQuestions([
    ...(technicalSample as Question[]),
    ...(technicalGenerated as Question[]),
    ...(technicalCastGenerated as Question[]),
    ...(technicalExpansionGenerated as Question[]),
  ]),
};

export function getQuestionsByType(type: QuestionType): Question[] {
  return questionBank[type] ?? [];
}

export function getAllQuestions(): Question[] {
  return Object.values(questionBank).flat();
}

export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find((q) => q.id === id);
}

/**
 * Selecciona preguntas únicas (sin repetir id ni contenido).
 * Si no hay suficientes en el banco, devuelve todas las disponibles sin duplicar.
 */
export function getRandomQuestions(
  type: QuestionType,
  count: number,
  excludeIds: string[] = [],
): Question[] {
  const excludeSet = new Set(excludeIds);
  const pool = getQuestionsByType(type).filter((q) => !excludeSet.has(q.id));
  const shuffled = shuffle(pool);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Preguntas para modo práctica: barajadas; `count` limita el tamaño de la sesión. */
export function getPracticeQuestions(type: QuestionType, count?: number): Question[] {
  const shuffled = shuffle(getQuestionsByType(type));
  if (count === undefined || count <= 0) return shuffled;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getMixedExamQuestions(config: {
  verbalCount: number;
  numericalCount: number;
  abstractCount: number;
  digitalCount: number;
  euCount: number;
  technicalCount: number;
}): Question[] {
  const usedIds: string[] = [];
  const pick = (type: QuestionType, count: number) => {
    if (count <= 0) return [] as Question[];
    const qs = getRandomQuestions(type, count, usedIds);
    usedIds.push(...qs.map((q) => q.id));
    return qs;
  };

  return shuffle([
    ...pick('verbal', config.verbalCount),
    ...pick('numerical', config.numericalCount),
    ...pick('abstract', config.abstractCount),
    ...pick('digital', config.digitalCount),
    ...pick('eu', config.euCount),
    ...pick('technical', config.technicalCount),
  ]);
}

export function countAvailable(type: QuestionType): number {
  return getQuestionsByType(type).length;
}

export { questionBank };
