import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnswerRecord,
  ExamAttempt,
  ExamConfig,
  PracticeSession,
  Question,
  QuestionType,
} from '@/types/question';
import { computeScoreByCategory, isAnswerCorrect } from '@/utils/stats';

interface ProgressState {
  allAnswers: AnswerRecord[];
  practiceSessions: PracticeSession[];
  examAttempts: ExamAttempt[];
  recordAnswer: (
    question: Question,
    selected: string | number,
    timeSpentMs: number,
  ) => AnswerRecord;
  savePracticeSession: (module: QuestionType, answers: AnswerRecord[]) => void;
  saveExamAttempt: (
    config: ExamConfig,
    answers: AnswerRecord[],
    totalTimeMs: number,
  ) => ExamAttempt;
  clearAllProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      allAnswers: [],
      practiceSessions: [],
      examAttempts: [],

      recordAnswer: (question, selected, timeSpentMs) => {
        const record: AnswerRecord = {
          questionId: question.id,
          questionType: question.type,
          difficulty: question.difficulty,
          category: question.category,
          correct: isAnswerCorrect(question, selected),
          timeSpentMs,
          timestamp: Date.now(),
          selectedAnswer: selected,
          correctAnswer: question.correctAnswer,
        };
        set({ allAnswers: [...get().allAnswers, record] });
        return record;
      },

      savePracticeSession: (module, answers) => {
        const session: PracticeSession = {
          id: crypto.randomUUID(),
          module,
          timestamp: Date.now(),
          answers,
        };
        set({ practiceSessions: [...get().practiceSessions, session] });
      },

      saveExamAttempt: (config, answers, totalTimeMs) => {
        const attempt: ExamAttempt = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          config,
          answers,
          scoreByCategory: computeScoreByCategory(answers),
          totalTimeMs,
        };
        set({ examAttempts: [...get().examAttempts, attempt] });
        return attempt;
      },

      clearAllProgress: () => {
        set({ allAnswers: [], practiceSessions: [], examAttempts: [] });
      },
    }),
    {
      name: 'epso-trainer-progress',
    },
  ),
);
