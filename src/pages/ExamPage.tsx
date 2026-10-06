import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnswerRecord, ExamConfig, ExamAttempt, Question } from '@/types/question';
import { EXAM_PRESETS } from '@/types/question';
import { getMixedExamQuestions } from '@/data';
import { useProgressStore } from '@/store/progressStore';
import { QuestionRenderer } from '@/components/QuestionRenderer';
import { TimerDisplay } from '@/components/TimerDisplay';
import { useTimer } from '@/hooks/useTimer';
import {
  computeAccuracy,
  formatAnswer,
  formatCategoryScoreLabel,
  formatDuration,
  getStudyRecommendations,
} from '@/utils/stats';
import { es } from '@/i18n/es';

const DEFAULT_CONFIG: ExamConfig = { ...EXAM_PRESETS[0].config };

type ExamPhase = 'config' | 'running' | 'review';

export function ExamPage() {
  const [phase, setPhase] = useState<ExamPhase>('config');
  const [config, setConfig] = useState<ExamConfig>(DEFAULT_CONFIG);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [answers, setAnswers] = useState<
    Map<number, { selected: string | number; timeMs: number }>
  >(new Map());
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const { elapsedMs, reset, pause, start } = useTimer({ autoStart: false });
  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const saveExamAttempt = useProgressStore((s) => s.saveExamAttempt);

  const timeLimitMs = config.timeLimitMinutes * 60 * 1000;
  const remainingMs = Math.max(0, timeLimitMs - elapsedMs);
  const expired = elapsedMs >= timeLimitMs;

  const finishExam = useCallback(() => {
    pause();
    const records: AnswerRecord[] = [];
    questions.forEach((q, i) => {
      const ans = answers.get(i);
      if (ans) {
        records.push(recordAnswer(q, ans.selected, ans.timeMs));
      }
    });
    const saved = saveExamAttempt(config, records, elapsedMs);
    setAttempt(saved);
    setPhase('review');
  }, [answers, config, elapsedMs, pause, questions, recordAnswer, saveExamAttempt]);

  const startExam = () => {
    const qs = getMixedExamQuestions(config);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setAnswers(new Map());
    setAttempt(null);
    reset();
    start();
    setPhase('running');
  };

  const applyPreset = (presetId: string) => {
    const preset = EXAM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig({ ...preset.config });
  };

  const handleAnswer = (value: string | number) => {
    if (expired) return;
    setSelected(value);
    setAnswers((prev) => new Map(prev).set(index, { selected: value, timeMs: elapsedMs }));
  };

  const goNext = () => {
    if (expired) {
      finishExam();
      return;
    }
    if (index + 1 >= questions.length) {
      finishExam();
    } else {
      setIndex((i) => i + 1);
      const nextAns = answers.get(index + 1);
      setSelected(nextAns?.selected ?? null);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
      const prevAns = answers.get(index - 1);
      setSelected(prevAns?.selected ?? null);
    }
  };

  if (phase === 'config') {
    const totalQuestions =
      config.verbalCount +
      config.numericalCount +
      config.abstractCount +
      config.digitalCount +
      config.euCount +
      config.technicalCount;

    return (
      <div className="space-y-6 max-w-xl">
        <div>
          <h1 className="text-xl font-bold">{es.exam.title}</h1>
          <p className="text-sm text-slate-400">{es.exam.subtitle}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">{es.exam.presetsTitle}</h2>
          <div className="grid gap-2">
            {EXAM_PRESETS.map((preset) => {
              const active = config.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`text-left p-3 rounded-lg border ${
                    active
                      ? 'border-rose-500 bg-rose-950/40'
                      : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                  }`}
                >
                  <p className="font-medium text-slate-100">{preset.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300">{es.exam.customTitle}</h2>
          {(
            [
              ['verbalCount', es.exam.verbalCount],
              ['numericalCount', es.exam.numericalCount],
              ['abstractCount', es.exam.abstractCount],
              ['digitalCount', es.exam.digitalCount],
              ['euCount', es.exam.euCount],
              ['technicalCount', es.exam.technicalCount],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-300">{label}</span>
              <input
                type="number"
                min={0}
                max={40}
                value={config[key]}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    [key]: Math.max(0, Number(e.target.value)),
                    presetId: 'custom',
                  }))
                }
                className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm"
              />
            </label>
          ))}

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-300">{es.exam.timeLimit}</span>
            <input
              type="number"
              min={5}
              max={180}
              value={config.timeLimitMinutes}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  timeLimitMinutes: Math.max(5, Number(e.target.value)),
                  presetId: 'custom',
                }))
              }
              className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-sm"
            />
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.strictMode}
              onChange={(e) => setConfig((c) => ({ ...c, strictMode: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-slate-300">{es.exam.strictMode}</span>
          </label>
        </section>

        <p className="text-xs text-slate-500">
          {totalQuestions} questions · {config.timeLimitMinutes} min
        </p>

        <button
          type="button"
          onClick={startExam}
          disabled={totalQuestions < 1}
          className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-medium"
        >
          {es.exam.start}
        </button>
      </div>
    );
  }

  if (phase === 'review' && attempt) {
    return (
      <ExamReview attempt={attempt} questions={questions} onRestart={() => setPhase('config')} />
    );
  }

  const question = questions[index];
  if (!question) return null;

  const answered = answers.has(index);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{es.exam.inProgress}</h1>
          <p className="text-sm text-slate-400">
            {es.practice.questionOf(index + 1, questions.length)}
          </p>
        </div>
        <TimerDisplay
          elapsedMs={elapsedMs}
          variant="countdown"
          remainingMs={remainingMs}
          label={es.exam.remaining}
          warning
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setIndex(i);
              setSelected(answers.get(i)?.selected ?? null);
            }}
            className={`w-8 h-8 rounded text-xs font-medium ${
              i === index
                ? 'bg-blue-600 text-white'
                : answers.has(i)
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <QuestionRenderer
        question={question}
        selected={selected}
        onSelect={handleAnswer}
        showResult={false}
        disabled={expired}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="px-4 py-2 rounded-lg border border-slate-600 text-sm disabled:opacity-40"
        >
          {es.exam.previous}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!answered && !expired}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-40"
        >
          {index + 1 >= questions.length ? es.exam.finishExam : es.exam.next}
        </button>
      </div>
    </div>
  );
}

function ExamReview({
  attempt,
  questions,
  onRestart,
}: {
  attempt: ExamAttempt;
  questions: Question[];
  onRestart: () => void;
}) {
  const correct = attempt.answers.filter((a) => a.correct).length;
  const recommendations = getStudyRecommendations(attempt);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{es.exam.results}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label={es.exam.score} value={`${correct}/${attempt.answers.length}`} />
        <MiniStat label={es.exam.accuracy} value={`${computeAccuracy(attempt.answers)}%`} />
        <MiniStat label={es.exam.timeUsed} value={formatDuration(attempt.totalTimeMs)} />
        <MiniStat label={es.exam.errors} value={String(attempt.answers.length - correct)} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">{es.exam.byCategory}</h2>
        <div className="space-y-2">
          {Object.entries(attempt.scoreByCategory).map(([type, score]) => (
            <div key={type} className="flex justify-between text-sm">
              <span className="text-slate-400">{formatCategoryScoreLabel(type)}</span>
              <span className="text-slate-200">
                {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">{es.exam.recommendations}</h2>
        <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
          {recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{es.exam.review}</h2>
        <div className="space-y-4">
          {attempt.answers.map((ans, i) => {
            const q = questions.find((qq) => qq.id === ans.questionId);
            if (!q) return null;
            return (
              <div
                key={ans.questionId}
                className={`p-4 rounded-lg border ${
                  ans.correct ? 'border-green-800 bg-green-900/10' : 'border-red-800 bg-red-900/10'
                }`}
              >
                <p className="text-sm font-medium">
                  P{i + 1} · {formatCategoryScoreLabel(ans.questionType)} ·{' '}
                  {ans.correct ? '✓' : '✗'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {es.exam.yourAnswer}: {formatAnswer(q, ans.selectedAnswer)} ·{' '}
                  {es.practice.correctAnswer}: {formatAnswer(q, ans.correctAnswer)}
                </p>
                <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{q.explanation}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm"
        >
          {es.exam.newExam}
        </button>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300"
        >
          {es.homeLink}
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
