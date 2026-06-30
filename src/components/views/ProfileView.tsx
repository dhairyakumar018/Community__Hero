import React, { useState } from 'react';
import useTranslations from '../../lib/useTranslations';
import { UserProfile, Issue } from '../../types';
import BadgeDisplay from '../BadgeDisplay';
import { fetchApi } from '../../lib/api';
import { LogOut, Award, User, Zap, Sparkles, TrendingUp, Shield } from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserProfile;
  issues: Issue[];
  onLogout: () => void;
  onUpdateUser: (profile: UserProfile) => void;
  onNavigate: (page: string) => void;
  theme?: 'dark' | 'light';
}

export default function ProfileView({
  currentUser,
  issues,
  onLogout,
  onUpdateUser,
  onNavigate,
  theme = 'dark'
}: ProfileViewProps) {
  const { t } = useTranslations();
  const [addingPoints, setAddingPoints] = useState(false);

  const citizenIssues = issues.filter(i => i.firebase_uid === currentUser.firebase_uid);

  // Level thresholds (each level is 100 points)
  const nextLevelPoints = (currentUser.level) * 100;
  const currentLevelBase = (currentUser.level - 1) * 100;
  const progressInLevel = currentUser.points - currentLevelBase;
  const progressPercent = Math.min(Math.max((progressInLevel / 100) * 100, 0), 100);

  const handleSimulatePoints = async () => {
    setAddingPoints(true);
    try {
      const res = await fetchApi<any>('/api/auth/profile', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: currentUser.firebase_uid,
          phone: currentUser.phone,
          display_name: currentUser.display_name,
          pointsToAdd: 25
        })
      });
      onUpdateUser(res);
    } catch {
      alert('Failed to simulate points.');
    } finally {
      setAddingPoints(false);
    }
  };

  const getLevelTierName = (lvl: number) => {
    if (lvl <= 1) return 'Local Vigilante';
    if (lvl === 2) return 'Senior Vigilante';
    if (lvl === 3) return 'District Guardian';
    return 'Metropolitan Protector';
  };

  return (
    <div id="profile-view" className="max-w-md mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* User Card */}
      <div className={`border rounded-3xl p-5 shadow-xl relative overflow-hidden backdrop-blur-md transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200 shadow-md'
          : 'bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border-white/10'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
        
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className={`text-base font-extrabold ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{currentUser.display_name}</h3>
              <span className="text-[9px] bg-blue-500/20 text-blue-500 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">
                {getLevelTierName(currentUser.level)}
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{currentUser.phone}</p>
          </div>
        </div>

        {/* Level Progress Indicator */}
        <div className="mt-6 space-y-1.5 relative z-10">
          <div className={`flex items-center justify-between text-[10px] font-bold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>LEVEL {currentUser.level}</span>
            <span>{currentUser.points} / {nextLevelPoints} PTS</span>
          </div>
          <div className={`w-full rounded-full h-2 overflow-hidden border ${theme === 'light' ? 'bg-slate-200 border-slate-300/60' : 'bg-slate-950 border-slate-800'}`}>
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className={`text-[9px] text-right ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
            {nextLevelPoints - currentUser.points} points needed to reach Level {currentUser.level + 1}
          </p>
        </div>
      </div>

      {/* Stats Counter blocks */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`border rounded-2xl p-3 text-center backdrop-blur-md transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
        }`}>
          <span className={`text-[9px] uppercase tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Points</span>
          <p className="text-base font-black text-blue-500 dark:text-blue-400 mt-1">{currentUser.points}</p>
        </div>
        <div className={`border rounded-2xl p-3 text-center backdrop-blur-md transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
        }`}>
          <span className={`text-[9px] uppercase tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Reports</span>
          <p className="text-base font-black text-emerald-500 dark:text-emerald-400 mt-1">{citizenIssues.length}</p>
        </div>
        <div className={`border rounded-2xl p-3 text-center backdrop-blur-md transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
        }`}>
          <span className={`text-[9px] uppercase tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Badges</span>
          <p className="text-base font-black text-amber-500 dark:text-amber-400 mt-1">{currentUser.badges.length}</p>
        </div>
      </div>

      {/* Badges Display Grid */}
      <div className="space-y-3">
        <h4 className={`text-xs font-extrabold uppercase tracking-widest flex items-center space-x-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          <Award className="w-4 h-4 text-amber-500" />
          <span>{t('badges')}</span>
        </h4>
        <BadgeDisplay userBadges={currentUser.badges} />
      </div>

      {/* Developer tool panel */}
      <div className={`border rounded-2xl p-4 space-y-3 backdrop-blur-md transition-colors duration-300 ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Judge Simulator Control</h4>
        </div>
        <p className={`text-[10px] leading-normal ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
          Unlock and test live point accumulations and level-up congratulations triggers.
        </p>
        <button
          onClick={handleSimulatePoints}
          disabled={addingPoints}
          className={`w-full border font-bold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 transition-colors ${
            theme === 'light'
              ? 'bg-slate-50 hover:bg-slate-100 text-amber-600 border-slate-200'
              : 'bg-white/5 hover:bg-white/10 text-yellow-400 border-white/10'
          }`}
        >
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span>{addingPoints ? 'Simulating...' : 'Inject +25 Points (Test Progression)'}</span>
        </button>
      </div>

      {/* Administrative Access Portal option */}
      <div className={`border rounded-2xl p-4 space-y-2.5 backdrop-blur-md transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-200 shadow-sm'
          : 'bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border-blue-500/25'
      }`}>
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-500 animate-pulse" />
          <h4 className={`text-[10px] font-extrabold uppercase tracking-widest ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>Municipal Command Center</h4>
        </div>
        <p className={`text-[10px] leading-normal ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
          Access the government-facing command portal to manage issues, route complaints, and inspect compliance audits.
        </p>
        <button
          onClick={() => onNavigate('admin')}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-500/20"
        >
          <span>Enter Administrative Portal</span>
        </button>
      </div>

      {/* Log out button */}
      <button
        id="btn-logout"
        onClick={onLogout}
        className={`w-full border font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all backdrop-blur-sm ${
          theme === 'light'
            ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
            : 'bg-red-950/20 hover:bg-red-950/30 text-red-400 border-red-500/20'
        }`}
      >
        <LogOut className="w-4 h-4" />
        <span>{t('logout')}</span>
      </button>
    </div>
  );
}
