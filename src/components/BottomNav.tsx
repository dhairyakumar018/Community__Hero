import { Home, MapPin, Plus, Trophy, User, Shield } from 'lucide-react';
import useTranslations from '../lib/useTranslations';

interface BottomNavProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isAdmin: boolean;
  theme?: 'dark' | 'light';
}

export default function BottomNav({ currentPage, setCurrentPage, isAdmin, theme = 'dark' }: BottomNavProps) {
  const { t } = useTranslations();

  return (
    <nav
      id="bottom-nav"
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 border-t border-x pb-safe shadow-2xl transition-all duration-300 ${
        theme === 'light'
          ? 'bg-slate-50/95 border-slate-200 backdrop-blur-md text-slate-800'
          : 'bg-[#121b2e]/95 border-white/10 backdrop-blur-xl text-slate-100'
      }`}
    >
      <div className="px-4 h-16 flex items-center justify-between">
        {/* Home */}
        <button
          id="nav-home"
          onClick={() => setCurrentPage('landing')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentPage === 'landing'
              ? 'text-blue-500 font-bold'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">{t('app_name')}</span>
        </button>

        {/* Map */}
        <button
          id="nav-map"
          onClick={() => setCurrentPage('map')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentPage === 'map'
              ? 'text-blue-500 font-bold'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">{t('map')}</span>
        </button>

        {/* Report (Floating center button) */}
        <button
          id="nav-report"
          onClick={() => setCurrentPage('report')}
          className="relative -top-4 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-all duration-200 border-4 focus:outline-none"
          style={{ borderColor: theme === 'light' ? '#f8fafc' : '#0a0f1e' }}
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* Leaderboard / Dashboard */}
        {isAdmin ? (
          <button
            id="nav-admin"
            onClick={() => setCurrentPage('admin')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              currentPage === 'admin'
                ? 'text-blue-500 font-bold'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">Dashboard</span>
          </button>
        ) : (
          <button
            id="nav-leaderboard"
            onClick={() => setCurrentPage('leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              currentPage === 'leaderboard'
                ? 'text-blue-500 font-bold'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">{t('leaderboard')}</span>
          </button>
        )}

        {/* Profile */}
        <button
          id="nav-profile"
          onClick={() => setCurrentPage('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentPage === 'profile'
              ? 'text-blue-500 font-bold'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-800'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">{t('profile')}</span>
        </button>
      </div>
    </nav>
  );
}
