import { useState, useEffect } from 'react';
import useTranslations from '../../lib/useTranslations';
import { UserProfile } from '../../types';
import { fetchApi } from '../../lib/api';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface LeaderboardViewProps {
  theme?: 'dark' | 'light';
}

export default function LeaderboardView({ theme = 'dark' }: LeaderboardViewProps) {
  const { t } = useTranslations();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<UserProfile[]>('/api/leaderboard')
      .then(data => {
        // Sort descending by points
        const sorted = [...data].sort((a, b) => b.points - a.points);
        setLeaders(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`text-center py-12 text-xs font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
        Fetching leaderboard standings...
      </div>
    );
  }

  // Slice podium users
  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];
  
  const remaining = leaders.slice(3, 10);

  return (
    <div id="leaderboard-view" className="max-w-md mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* View Header */}
      <div className="text-center space-y-1">
        <h2 className={`text-sm font-extrabold uppercase tracking-widest flex items-center justify-center space-x-1.5 ${
          theme === 'light' ? 'text-slate-800' : 'text-slate-100'
        }`}>
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>{t('leaderboard')}</span>
        </h2>
        <p className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Top-performing citizen heroes who are cleaning up local spaces.</p>
      </div>

      {/* Podium Grid (Visual Heights) */}
      <div className="grid grid-cols-3 gap-3 items-end pt-8 pb-4" id="leaderboard-podium">
        {/* Silver Rank 2 */}
        {top2 && (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-base font-extrabold shadow-lg backdrop-blur-md ${
                theme === 'light' ? 'bg-white border-slate-300 text-slate-800' : 'bg-white/5 border-slate-400/50 text-slate-200'
              }`}>
                🥈
              </div>
              <span className="absolute -bottom-1 -right-1 bg-slate-600 text-white font-mono font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-slate-400">
                2
              </span>
            </div>
            <div className="text-center w-full">
              <p className={`text-xs font-bold truncate px-1 ${
                theme === 'light' ? 'text-slate-800' : 'text-slate-200'
              }`}>{top2.display_name.split(' ')[0]}</p>
              <p className={`text-[10px] font-mono font-bold mt-0.5 ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>{top2.points} pts</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                theme === 'light' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700/60'
              }`}>
                Lvl {top2.level}
              </span>
            </div>
          </div>
        )}

        {/* Gold Rank 1 (Tallest) */}
        {top1 && (
          <div className="flex flex-col items-center space-y-2 relative -top-3">
            <div className="relative">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl animate-bounce">👑</div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 border-2 border-amber-300 flex items-center justify-center text-slate-900 text-lg font-black shadow-xl shadow-orange-500/10">
                🥇
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-mono font-bold text-[10px] w-6 h-6 rounded-full flex items-center justify-center border border-amber-300">
                1
              </span>
            </div>
            <div className="text-center w-full">
              <p className={`text-sm font-black truncate px-1 ${
                theme === 'light' ? 'text-amber-600' : 'text-amber-300'
              }`}>{top1.display_name.split(' ')[0]}</p>
              <p className={`text-xs font-extrabold font-mono mt-0.5 ${
                theme === 'light' ? 'text-slate-800' : 'text-slate-100'
              }`}>{top1.points} pts</p>
              <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
                theme === 'light' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                Lvl {top1.level}
              </span>
            </div>
          </div>
        )}

        {/* Bronze Rank 3 */}
        {top3 && (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-base font-extrabold shadow-lg backdrop-blur-md ${
                theme === 'light' ? 'bg-white border-amber-800/20 text-amber-700' : 'bg-white/5 border-amber-800/50 text-amber-600'
              }`}>
                🥉
              </div>
              <span className="absolute -bottom-1 -right-1 bg-amber-800 text-white font-mono font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-amber-700">
                3
              </span>
            </div>
            <div className="text-center w-full">
              <p className={`text-xs font-bold truncate px-1 ${
                theme === 'light' ? 'text-slate-800' : 'text-slate-200'
              }`}>{top3.display_name.split(' ')[0]}</p>
              <p className={`text-[10px] font-mono font-bold mt-0.5 ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>{top3.points} pts</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                theme === 'light' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700/60'
              }`}>
                Lvl {top3.level}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ranked List remaining entries */}
      <div className={`border rounded-3xl p-4 space-y-3 shadow-md backdrop-blur-md ${
        theme === 'light' ? 'bg-white border-slate-200/80 shadow-sm' : 'bg-white/5 border-white/10'
      }`} id="leaderboard-list">
        {remaining.map((player, idx) => {
          const rank = idx + 4;
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-xl border border-transparent transition-all duration-200 ${
                theme === 'light' ? 'hover:bg-slate-50 hover:border-slate-100' : 'hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                {/* Position Rank */}
                <span className="w-5 text-center text-xs font-bold text-slate-500 font-mono">
                  {rank}
                </span>

                {/* Avatar Placeholder */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border ${
                  theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'
                }`}>
                  {player.display_name.slice(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${
                    theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                  }`}>
                    {player.display_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className={`text-[9px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Level {player.level}</span>
                    <span className={`text-[9px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>•</span>
                    <span className={`text-[9px] flex items-center ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      <Award className="w-2.5 h-2.5 text-blue-400 mr-0.5" />
                      {player.badges.length} badges
                    </span>
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className={`text-xs font-bold font-mono ${
                  theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                }`}>
                  {player.points}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-slate-500 font-extrabold font-mono">
                  PTS
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export { Trophy };
