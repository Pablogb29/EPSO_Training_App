export const es = {
  appName: 'EPSO Trainer',
  appSubtitle: 'Preparación CAST / EPSO',
  backHome: '← Inicio',
  homeLink: 'Inicio',

  home: {
    title: 'EPSO Trainer',
    subtitle:
      'Banco EPSOprep (EN): verbal, numérico, abstracto, digital, EU knowledge + ciber como extra.',
    answered: 'Respondidas',
    accuracy: 'Aciertos',
    avgTime: 'Tiempo medio',
    weakAreas: 'Áreas débiles',
    modules: 'Módulos',
    none: '—',
    bankNote:
      'Preguntas en inglés (idioma del banco). Uso privado de estudio; no redistribuir el material.',
  },

  verbal: {
    passage: 'Passage',
    defaultQuestion: 'Which of the following statements is correct?',
  },

  modules: {
    verbal: {
      title: 'Verbal Reasoning',
      description: 'Text + statements; choose the correct one',
    },
    numerical: {
      title: 'Numerical Reasoning',
      description: 'Charts, ratios, percentages and trends',
    },
    abstract: {
      title: 'Abstract Reasoning',
      description: 'Visual patterns and logical sequences',
    },
    digital: {
      title: 'Digital Skills',
      description: 'Office, browser, cloud and basic IT',
    },
    eu: {
      title: 'EU Knowledge',
      description: 'Treaties, institutions and EU policies',
    },
    technical: {
      title: 'Cybersecurity (extra)',
      description: 'IAM, cloud, compliance and IT security',
    },
    exam: {
      title: 'Exam simulator',
      description: 'Timed random exam with CAST / full presets',
    },
    statistics: {
      title: 'Statistics',
      description: 'Progress, weak areas and session history',
    },
  },

  practice: {
    setupTitle: 'Practice setup',
    setupSubtitle: 'No timer. Choose how many questions to practise.',
    available: (n: number) => `${n} questions available`,
    questionCount: 'Number of questions',
    allQuestions: 'All',
    start: 'Start practice',
    questionOf: (n: number, total: number) => `Question ${n} of ${total}`,
    difficulty: (d: number) => `Difficulty ${d}/5`,
    time: 'Time',
    submit: 'Submit answer',
    next: 'Next question',
    finish: 'Finish',
    correct: '✓ Correct',
    incorrect: '✗ Incorrect',
    correctAnswer: 'Correct answer',
    complete: 'Complete',
    score: (correct: number, total: number, pct: number) =>
      `Score: ${correct}/${total} (${pct}%)`,
    practiceAgain: 'Practice again',
    changeSetup: 'Change setup',
    invalidModule: 'Invalid module.',
    noQuestions: 'No questions available for this module.',
  },

  exam: {
    title: 'Exam simulator',
    subtitle: 'Pick a preset or customise counts and time. Strict mode hides explanations until the end.',
    presetsTitle: 'Presets',
    customTitle: 'Custom',
    presets: {
      castTitle: 'CAST FG III/IV',
      castDescription: '20 verbal + 10 numerical + 10 abstract · 65 min (35+20+10)',
      fullTitle: 'EPSO-style full',
      fullDescription: 'CAST reasoning + 10 Digital + 10 EU · 90 min',
      quickTitle: 'Quick drill',
      quickDescription: '5 + 5 + 5 reasoning · 25 min',
    },
    verbalCount: 'Verbal',
    numericalCount: 'Numerical',
    abstractCount: 'Abstract',
    digitalCount: 'Digital Skills',
    euCount: 'EU Knowledge',
    technicalCount: 'Cyber (extra)',
    timeLimit: 'Time limit (minutes)',
    strictMode: 'Strict mode (no explanations during the exam)',
    start: 'Start exam',
    inProgress: 'Exam in progress',
    remaining: 'Remaining',
    previous: 'Previous',
    next: 'Next',
    finishExam: 'Finish exam',
    results: 'Exam results',
    score: 'Score',
    accuracy: 'Accuracy',
    timeUsed: 'Time used',
    errors: 'Errors',
    byCategory: 'Score by category',
    recommendations: 'Study recommendations',
    review: 'Answer review',
    yourAnswer: 'Your answer',
    newExam: 'New exam',
  },

  stats: {
    title: 'Statistics',
    clearProgress: 'Clear progress',
    clearConfirm: 'Clear all progress? This cannot be undone.',
    noData: 'No data yet. Complete a practice session or exam to see statistics.',
    totalAnswered: 'Total answered',
    overallAccuracy: 'Overall accuracy',
    avgTime: 'Average time',
    weakAreas: 'Weak areas',
    noneDetected: 'None detected',
    byType: 'By question type',
    byDifficulty: 'By difficulty',
    byCategory: 'By category',
    level: (n: number) => `Level ${n}`,
    recentSessions: 'Recent sessions',
    noSessions: 'No sessions recorded.',
    practice: (module: string) => `Practice: ${module}`,
    exam: 'Exam',
  },

  questionTypes: {
    verbal: 'Verbal',
    numerical: 'Numerical',
    abstract: 'Abstract',
    digital: 'Digital',
    eu: 'EU Knowledge',
    technical: 'Cyber',
  },

  abstract: {
    option: (n: number) => `Option ${n}`,
    imageHint: 'Choose the letter that matches the correct diagram in the image (A–E).',
  },

  recommendations: {
    focus: (type: string, pct: number, correct: number, total: number) =>
      `Focus on ${type} — ${Math.round(pct)}% (${correct}/${total}).`,
    review: (type: string, pct: number) =>
      `Review ${type} — room to improve at ${Math.round(pct)}%.`,
    speed: (avg: number) =>
      `Work on speed — average ${avg}s per question, above target.`,
    strong: 'Strong across sections. Try a longer timed exam.',
  },
} as const;

export type Locale = typeof es;
