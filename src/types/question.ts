import { es } from '@/i18n/es';

export type QuestionType =
  | 'verbal'
  | 'numerical'
  | 'abstract'
  | 'digital'
  | 'eu'
  | 'technical';

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  explanation: string;
  source?: string;
  language?: string;
}

/** Verbal: passage + question + options (usually A–D). */
export interface VerbalQuestion extends BaseQuestion {
  type: 'verbal';
  passage: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

/** Numerical: chart/table image and/or dataTable. */
export interface NumericalQuestion extends BaseQuestion {
  type: 'numerical';
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  dataTable?: { headers: string[]; rows: string[][] };
}

/**
 * Abstract: usually one composite image (series + options).
 * Legacy SVG fields kept for archived banks.
 */
export interface AbstractQuestion extends BaseQuestion {
  type: 'abstract';
  prompt: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  promptSvg?: string;
  optionSvgs?: string[];
}

/** Digital Skills MCQ. */
export interface DigitalQuestion extends BaseQuestion {
  type: 'digital';
  question: string;
  options: string[];
  correctAnswer: number;
}

/** EU Knowledge MCQ. */
export interface EuQuestion extends BaseQuestion {
  type: 'eu';
  question: string;
  options: string[];
  correctAnswer: number;
}

/** Cybersecurity technical (extra module). */
export interface TechnicalQuestion extends BaseQuestion {
  type: 'technical';
  question: string;
  options: string[];
  correctAnswer: number;
}

export type Question =
  | VerbalQuestion
  | NumericalQuestion
  | AbstractQuestion
  | DigitalQuestion
  | EuQuestion
  | TechnicalQuestion;

export interface AnswerRecord {
  questionId: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  category: string;
  correct: boolean;
  timeSpentMs: number;
  timestamp: number;
  selectedAnswer: string | number;
  correctAnswer: string | number;
}

export interface ExamConfig {
  verbalCount: number;
  numericalCount: number;
  abstractCount: number;
  digitalCount: number;
  euCount: number;
  technicalCount: number;
  timeLimitMinutes: number;
  strictMode: boolean;
  presetId?: string;
}

export interface ExamPreset {
  id: string;
  title: string;
  description: string;
  config: ExamConfig;
}

export interface ExamAttempt {
  id: string;
  timestamp: number;
  config: ExamConfig;
  answers: AnswerRecord[];
  scoreByCategory: Record<string, { correct: number; total: number }>;
  totalTimeMs: number;
}

export interface PracticeSession {
  id: string;
  module: QuestionType;
  timestamp: number;
  answers: AnswerRecord[];
}

export interface ModuleInfo {
  id: QuestionType | 'exam' | 'statistics';
  title: string;
  description: string;
  path: string;
  color: string;
}

export const VERBAL_DEFAULT_QUESTION = es.verbal.defaultQuestion;

export const PRACTICE_COUNTS = [5, 10, 15, 20, 25, 30] as const;

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'cast-fgiv',
    title: es.exam.presets.castTitle,
    description: es.exam.presets.castDescription,
    config: {
      verbalCount: 20,
      numericalCount: 10,
      abstractCount: 10,
      digitalCount: 0,
      euCount: 0,
      technicalCount: 0,
      timeLimitMinutes: 65,
      strictMode: true,
      presetId: 'cast-fgiv',
    },
  },
  {
    id: 'epso-full',
    title: es.exam.presets.fullTitle,
    description: es.exam.presets.fullDescription,
    config: {
      verbalCount: 20,
      numericalCount: 10,
      abstractCount: 10,
      digitalCount: 10,
      euCount: 10,
      technicalCount: 0,
      timeLimitMinutes: 90,
      strictMode: true,
      presetId: 'epso-full',
    },
  },
  {
    id: 'quick',
    title: es.exam.presets.quickTitle,
    description: es.exam.presets.quickDescription,
    config: {
      verbalCount: 5,
      numericalCount: 5,
      abstractCount: 5,
      digitalCount: 0,
      euCount: 0,
      technicalCount: 0,
      timeLimitMinutes: 25,
      strictMode: true,
      presetId: 'quick',
    },
  },
];

export const MODULES: ModuleInfo[] = [
  {
    id: 'verbal',
    title: es.modules.verbal.title,
    description: es.modules.verbal.description,
    path: '/practice/verbal',
    color: 'from-blue-600 to-blue-800',
  },
  {
    id: 'numerical',
    title: es.modules.numerical.title,
    description: es.modules.numerical.description,
    path: '/practice/numerical',
    color: 'from-emerald-600 to-emerald-800',
  },
  {
    id: 'abstract',
    title: es.modules.abstract.title,
    description: es.modules.abstract.description,
    path: '/practice/abstract',
    color: 'from-purple-600 to-purple-800',
  },
  {
    id: 'digital',
    title: es.modules.digital.title,
    description: es.modules.digital.description,
    path: '/practice/digital',
    color: 'from-cyan-600 to-cyan-800',
  },
  {
    id: 'eu',
    title: es.modules.eu.title,
    description: es.modules.eu.description,
    path: '/practice/eu',
    color: 'from-indigo-600 to-indigo-800',
  },
  {
    id: 'technical',
    title: es.modules.technical.title,
    description: es.modules.technical.description,
    path: '/practice/technical',
    color: 'from-amber-600 to-amber-800',
  },
  {
    id: 'exam',
    title: es.modules.exam.title,
    description: es.modules.exam.description,
    path: '/exam',
    color: 'from-rose-600 to-rose-800',
  },
  {
    id: 'statistics',
    title: es.modules.statistics.title,
    description: es.modules.statistics.description,
    path: '/statistics',
    color: 'from-slate-600 to-slate-800',
  },
];

export const MODULE_TITLES: Record<QuestionType, string> = {
  verbal: es.modules.verbal.title,
  numerical: es.modules.numerical.title,
  abstract: es.modules.abstract.title,
  digital: es.modules.digital.title,
  eu: es.modules.eu.title,
  technical: es.modules.technical.title,
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  verbal: es.questionTypes.verbal,
  numerical: es.questionTypes.numerical,
  abstract: es.questionTypes.abstract,
  digital: es.questionTypes.digital,
  eu: es.questionTypes.eu,
  technical: es.questionTypes.technical,
};
