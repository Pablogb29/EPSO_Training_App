import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AnswerRecord, Question, QuestionType } from '@/types/question';
import { MODULE_TITLES, PRACTICE_COUNTS } from '@/types/question';
import { countAvailable, getPracticeQuestions } from '@/data';
import { useProgressStore } from '@/store/progressStore';
import { QuestionRenderer } from '@/components/QuestionRenderer';
import { formatAnswer } from '@/utils/stats';
import { es } from '@/i18n/es';

type Phase = 'setup' | 'running' | 'done';

export function PracticePage() {
  const { module } = useParams<{ module: QuestionType }>();
  const type = module as QuestionType;
  const available = type && MODULE_TITLES[type] ? countAvailable(type) : 0;

  const [phase, setPhase] = useState<Phase>('setup');
  const [countChoice, setCountChoice] = useState<number | 'all'>(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<AnswerRecord[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());

  const recordAnswer = useProgressStore((s) => s.recordAnswer);
  const savePracticeSession = useProgressStore((s) => s.savePracticeSession);

  useEffect(() => {
    setPhase('setup');
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setShowResult(false);
    setSessionAnswers([]);
    setCountChoice(10);
  }, [type]);

  const resolvedCount = useMemo(() => {
    if (countChoice === 'all') return available;
    return Math.min(countChoice, available);
  }, [available, countChoice]);

  const startPractice = () => {
    const qs = getPracticeQuestions(type, resolvedCount);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setShowResult(false);
    setSessionAnswers([]);
    setQuestionStartedAt(Date.now());
    setPhase('running');
  };

  const resetToSetup = () => {
    setPhase('setup');
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setShowResult(false);
    setSessionAnswers([]);
  };

  const question: Question | undefined = questions[index];

  const handleSubmit = useCallback(() => {
    if (!question || selected === null) return;
    const timeSpentMs = Date.now() - questionStartedAt;
    const record = recordAnswer(question, selected, timeSpentMs);
    setSessionAnswers((prev) => [...prev, record]);
    setShowResult(true);
  }, [question, selected, questionStartedAt, recordAnswer]);

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setSessionAnswers((current) => {
        savePracticeSession(type, current);
        return current;
      });
      setPhase('done');
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setShowResult(false);
    setQuestionStartedAt(Date.now());
  }, [index, questions.length, savePracticeSession, type]);

  if (!type || !MODULE_TITLES[type]) {
    return <p className="text-red-400">{es.practice.invalidModule}</p>;
  }

  if (available === 0) {
    return (
      <div>
        <p className="text-slate-400">{es.practice.noQuestions}</p>
        <Link to="/" className="text-blue-400 mt-4 inline-block">
          {es.backHome}
        </Link>
      </div>
    );
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="text-xl font-bold">{MODULE_TITLES[type]}</h1>
          <p className="mt-1 text-sm text-slate-400">{es.practice.setupSubtitle}</p>
          <p className="mt-2 text-sm text-slate-500">{es.practice.available(available)}</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-300">{es.practice.questionCount}</legend>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                disabled={n > available}
                onClick={() => setCountChoice(n)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  countChoice === n
                    ? 'border-blue-500 bg-blue-900/40 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                } disabled:opacity-40`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCountChoice('all')}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                countChoice === 'all'
                  ? 'border-blue-500 bg-blue-900/40 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
              }`}
            >
              {es.practice.allQuestions} ({available})
            </button>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={startPractice}
          disabled={resolvedCount < 1}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium"
        >
          {es.practice.start} · {resolvedCount}
        </button>
      </div>
    );
  }

  if (phase === 'done') {
    const correct = sessionAnswers.filter((a) => a.correct).length;
    const pct = sessionAnswers.length
      ? Math.round((correct / sessionAnswers.length) * 100)
      : 0;
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">
          {MODULE_TITLES[type]} — {es.practice.complete}
        </h1>
        <p className="text-slate-300">{es.practice.score(correct, sessionAnswers.length, pct)}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={startPractice}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            {es.practice.practiceAgain}
          </button>
          <button
            type="button"
            onClick={resetToSetup}
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:border-slate-500"
          >
            {es.practice.changeSetup}
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:border-slate-500"
          >
            {es.homeLink}
          </Link>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{MODULE_TITLES[type]}</h1>
        <p className="text-sm text-slate-400">
          {es.practice.questionOf(index + 1, questions.length)} ·{' '}
          {es.practice.difficulty(question.difficulty)}
        </p>
      </div>

      <QuestionRenderer
        question={question}
        selected={selected}
        onSelect={setSelected}
        showResult={showResult}
        disabled={showResult}
      />

      {showResult && (
        <div
          className={`p-4 rounded-lg border ${
            sessionAnswers[sessionAnswers.length - 1]?.correct
              ? 'border-green-700 bg-green-900/20'
              : 'border-red-700 bg-red-900/20'
          }`}
        >
          <p className="font-medium">
            {sessionAnswers[sessionAnswers.length - 1]?.correct
              ? es.practice.correct
              : es.practice.incorrect}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {es.practice.correctAnswer}: {formatAnswer(question, question.correctAnswer)}
          </p>
          <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{question.explanation}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!showResult ? (
          <button
            type="button"
            disabled={selected === null}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            {es.practice.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            {index + 1 >= questions.length ? es.practice.finish : es.practice.next}
          </button>
        )}
      </div>
    </div>
  );
}
