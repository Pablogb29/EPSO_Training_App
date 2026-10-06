import { Link } from 'react-router-dom';
import { MODULES } from '@/types/question';
import { useProgressStore } from '@/store/progressStore';
import { computeAccuracy, computeAverageTime, getWeakAreas } from '@/utils/stats';
import { es } from '@/i18n/es';

export function HomePage() {
  const allAnswers = useProgressStore((s) => s.allAnswers);
  const accuracy = computeAccuracy(allAnswers);
  const avgTime = computeAverageTime(allAnswers);
  const weakAreas = getWeakAreas(allAnswers);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-slate-100">{es.home.title}</h1>
        <p className="mt-1 text-slate-400">{es.home.subtitle}</p>
        <p className="mt-2 text-xs text-slate-500">{es.home.bankNote}</p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={es.home.answered} value={String(allAnswers.length)} />
        <StatCard label={es.home.accuracy} value={`${accuracy}%`} />
        <StatCard label={es.home.avgTime} value={`${avgTime}s`} />
        <StatCard
          label={es.home.weakAreas}
          value={weakAreas.length > 0 ? weakAreas.join(', ') : es.home.none}
          small
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">{es.home.modules}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((mod) => (
            <Link
              key={mod.id}
              to={mod.path}
              className="group block p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900 transition-all"
            >
              <div
                className={`h-1 w-12 rounded-full bg-gradient-to-r ${mod.color} mb-3 group-hover:w-16 transition-all`}
              />
              <h3 className="font-semibold text-slate-100">{mod.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{mod.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 font-semibold text-slate-100 ${small ? 'text-sm truncate' : 'text-xl'}`}>
        {value}
      </p>
    </div>
  );
}
