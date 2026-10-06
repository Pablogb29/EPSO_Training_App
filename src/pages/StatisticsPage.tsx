import { Link } from 'react-router-dom';
import { useProgressStore } from '@/store/progressStore';
import {
  computeAccuracy,
  computeAverageTime,
  formatCategoryScoreLabel,
  getRecentSessions,
  getStatsByCategory,
  getStatsByDifficulty,
  getWeakAreas,
} from '@/utils/stats';
import { es } from '@/i18n/es';

export function StatisticsPage() {
  const allAnswers = useProgressStore((s) => s.allAnswers);
  const practiceSessions = useProgressStore((s) => s.practiceSessions);
  const examAttempts = useProgressStore((s) => s.examAttempts);
  const clearAllProgress = useProgressStore((s) => s.clearAllProgress);

  const byType = allAnswers.reduce<
    Record<string, { correct: number; total: number; totalTime: number }>
  >((acc, a) => {
    if (!acc[a.questionType]) acc[a.questionType] = { correct: 0, total: 0, totalTime: 0 };
    acc[a.questionType].total += 1;
    acc[a.questionType].totalTime += a.timeSpentMs;
    if (a.correct) acc[a.questionType].correct += 1;
    return acc;
  }, {});

  const byDifficulty = getStatsByDifficulty(allAnswers);
  const byCategory = getStatsByCategory(allAnswers);
  const recent = getRecentSessions(practiceSessions, examAttempts);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{es.stats.title}</h1>
        {allAnswers.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm(es.stats.clearConfirm)) clearAllProgress();
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            {es.stats.clearProgress}
          </button>
        )}
      </div>

      {allAnswers.length === 0 ? (
        <p className="text-slate-400">{es.stats.noData}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={es.stats.totalAnswered} value={String(allAnswers.length)} />
            <Stat label={es.stats.overallAccuracy} value={`${computeAccuracy(allAnswers)}%`} />
            <Stat label={es.stats.avgTime} value={`${computeAverageTime(allAnswers)}s`} />
            <Stat
              label={es.stats.weakAreas}
              value={getWeakAreas(allAnswers).join(', ') || es.stats.noneDetected}
              small
            />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">{es.stats.byType}</h2>
            <div className="space-y-2">
              {Object.entries(byType).map(([type, stats]) => (
                <BarRow
                  key={type}
                  label={formatCategoryScoreLabel(type)}
                  pct={Math.round((stats.correct / stats.total) * 100)}
                  detail={`${stats.correct}/${stats.total} · media ${Math.round(stats.totalTime / stats.total / 1000)}s`}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">{es.stats.byDifficulty}</h2>
            <div className="space-y-2">
              {Object.entries(byDifficulty)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([diff, stats]) => (
                  <BarRow
                    key={diff}
                    label={es.stats.level(Number(diff))}
                    pct={Math.round((stats.correct / stats.total) * 100)}
                    detail={`${stats.correct}/${stats.total}`}
                  />
                ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">{es.stats.byCategory}</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(byCategory).map(([cat, stats]) => (
                <div
                  key={cat}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm"
                >
                  <span className="text-slate-300">{cat}</span>
                  <span className="float-right text-slate-400">
                    {stats.correct}/{stats.total}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">{es.stats.recentSessions}</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">{es.stats.noSessions}</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm"
              >
                <span className="text-slate-300">{s.type}</span>
                <span className="text-slate-500">{s.date}</span>
                <span className="text-slate-400">{s.score}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link to="/" className="inline-block text-sm text-blue-400 hover:text-blue-300">
        {es.backHome}
      </Link>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold ${small ? 'text-sm truncate' : 'text-lg'}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500">{detail}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
