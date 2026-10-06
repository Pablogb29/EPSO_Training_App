import type {
  AnswerRecord,
  ExamAttempt,
  PracticeSession,
  Question,
  QuestionType,
} from '@/types/question';
import { QUESTION_TYPE_LABELS } from '@/types/question';
import { es } from '@/i18n/es';

export function isAnswerCorrect(question: Question, selected: string | number): boolean {
  return selected === question.correctAnswer;
}

export function formatAnswer(question: Question, answer: string | number): string {
  if (question.type === 'abstract') {
    if (question.optionSvgs && question.optionSvgs.length > 0) {
      return es.abstract.option((answer as number) + 1);
    }
    const index = answer as number;
    const letter = String.fromCharCode(65 + index);
    const text = question.options[index];
    return text ? `${letter}. ${text}` : letter;
  }

  if (
    question.type === 'verbal' ||
    question.type === 'numerical' ||
    question.type === 'digital' ||
    question.type === 'eu' ||
    question.type === 'technical'
  ) {
    const index = answer as number;
    const letter = String.fromCharCode(65 + index);
    const text = question.options[index];
    return text ? `${letter}. ${text}` : String(answer);
  }

  return String(answer);
}

export function computeScoreByCategory(
  answers: AnswerRecord[],
): Record<string, { correct: number; total: number }> {
  const scores: Record<string, { correct: number; total: number }> = {};
  for (const a of answers) {
    if (!scores[a.questionType]) {
      scores[a.questionType] = { correct: 0, total: 0 };
    }
    scores[a.questionType].total += 1;
    if (a.correct) scores[a.questionType].correct += 1;
  }
  return scores;
}

export function computeAccuracy(answers: AnswerRecord[]): number {
  if (answers.length === 0) return 0;
  const correct = answers.filter((a) => a.correct).length;
  return Math.round((correct / answers.length) * 100);
}

export function computeAverageTime(answers: AnswerRecord[]): number {
  if (answers.length === 0) return 0;
  const total = answers.reduce((sum, a) => sum + a.timeSpentMs, 0);
  return Math.round(total / answers.length / 1000);
}

export function getWeakAreas(answers: AnswerRecord[]): string[] {
  const byType: Record<string, { correct: number; total: number }> = {};
  for (const a of answers) {
    if (!byType[a.questionType]) byType[a.questionType] = { correct: 0, total: 0 };
    byType[a.questionType].total += 1;
    if (a.correct) byType[a.questionType].correct += 1;
  }
  return Object.entries(byType)
    .filter(([, s]) => s.total >= 3 && s.correct / s.total < 0.6)
    .map(([type]) => QUESTION_TYPE_LABELS[type as QuestionType] ?? type);
}

export function getStudyRecommendations(attempt: ExamAttempt): string[] {
  const recs: string[] = [];
  for (const [type, score] of Object.entries(attempt.scoreByCategory)) {
    const pct = score.total > 0 ? (score.correct / score.total) * 100 : 0;
    const label = QUESTION_TYPE_LABELS[type as QuestionType] ?? type;
    if (pct < 60) {
      recs.push(es.recommendations.focus(label.toLowerCase(), pct, score.correct, score.total));
    } else if (pct < 80) {
      recs.push(es.recommendations.review(label.toLowerCase(), pct));
    }
  }
  const avgTime = computeAverageTime(attempt.answers);
  if (avgTime > 90) {
    recs.push(es.recommendations.speed(avgTime));
  }
  if (recs.length === 0) {
    recs.push(es.recommendations.strong);
  }
  return recs;
}

export function getStatsByDifficulty(
  answers: AnswerRecord[],
): Record<number, { correct: number; total: number }> {
  const stats: Record<number, { correct: number; total: number }> = {};
  for (const a of answers) {
    if (!stats[a.difficulty]) stats[a.difficulty] = { correct: 0, total: 0 };
    stats[a.difficulty].total += 1;
    if (a.correct) stats[a.difficulty].correct += 1;
  }
  return stats;
}

export function getStatsByCategory(
  answers: AnswerRecord[],
): Record<string, { correct: number; total: number }> {
  const stats: Record<string, { correct: number; total: number }> = {};
  for (const a of answers) {
    if (!stats[a.category]) stats[a.category] = { correct: 0, total: 0 };
    stats[a.category].total += 1;
    if (a.correct) stats[a.category].correct += 1;
  }
  return stats;
}

export function getRecentSessions(
  practiceSessions: PracticeSession[],
  examAttempts: ExamAttempt[],
  limit = 5,
): Array<{ type: string; date: string; score: string; id: string }> {
  const items = [
    ...practiceSessions.map((s) => ({
      type: es.stats.practice(QUESTION_TYPE_LABELS[s.module]),
      date: new Date(s.timestamp).toLocaleDateString('es-ES'),
      score: `${s.answers.filter((a) => a.correct).length}/${s.answers.length}`,
      id: s.id,
      timestamp: s.timestamp,
    })),
    ...examAttempts.map((e) => ({
      type: es.stats.exam,
      date: new Date(e.timestamp).toLocaleDateString('es-ES'),
      score: `${e.answers.filter((a) => a.correct).length}/${e.answers.length}`,
      id: e.id,
      timestamp: e.timestamp,
    })),
  ];
  return items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(({ type, date, score, id }) => ({ type, date, score, id }));
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatCategoryScoreLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type as QuestionType] ?? type;
}
