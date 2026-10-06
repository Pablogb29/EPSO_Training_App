import { Link, Outlet, useLocation } from 'react-router-dom';
import { es } from '@/i18n/es';

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">
              {es.appName}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">{es.appSubtitle}</span>
          </Link>
          {!isHome && (
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
              {es.backHome}
            </Link>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
