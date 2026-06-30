import React from 'react';
import { Issue, UserProfile } from '../../types';
import { Camera, MapPin, TrendingUp, Users, CheckCircle, Shield, ArrowRight, MessageSquare, Sun, Moon } from 'lucide-react';
import useTranslations from '../../lib/useTranslations';
import IssueCard from '../IssueCard';
import LanguageSwitcher from '../LanguageSwitcher';

interface LandingViewProps {
  issues: Issue[];
  onNavigate: (page: string) => void;
  onSelectIssue: (id: string) => void;
  currentUser: UserProfile | null;
  onTriggerAdminLogin: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function LandingView({
  issues,
  onNavigate,
  onSelectIssue,
  currentUser,
  onTriggerAdminLogin,
  theme = 'dark',
  onToggleTheme
}: LandingViewProps) {
  const { t } = useTranslations();

  // Calculate stats dynamically
  const activeIssues = issues.filter(i => i.status !== 'resolved');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  
  // Calculate SLA Compliance percentage (reported before SLA deadline)
  const slaCompliant = resolvedIssues.filter(i => {
    if (!i.resolved_at || !i.sla_deadline) return true;
    return new Date(i.resolved_at) <= new Date(i.sla_deadline);
  });
  const slaPercentage = resolvedIssues.length > 0 
    ? Math.round((slaCompliant.length / resolvedIssues.length) * 100) 
    : 95;

  // Active citizen count (approximated from issues and mock contributors)
  const activeCitizens = new Set(issues.map(i => i.firebase_uid)).size + 3;

  return (
    <div id="landing-view" className="space-y-6 pb-24 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
            CH
          </div>
          <span className={`font-sans font-bold text-lg tracking-tight ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
            {t('app_name')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-yellow-400" />}
            </button>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      {/* Hero card */}
      <div className={`relative overflow-hidden border rounded-3xl p-6 shadow-2xl backdrop-blur-md transition-colors duration-300 ${
        theme === 'light'
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50/50 border-slate-200/80 shadow-md'
          : 'bg-gradient-to-br from-indigo-900/40 to-slate-900/60 border-white/10'
      }`}>
        {/* Subtle decorative nodes */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-4 relative z-10 max-w-lg">
          <span className="inline-flex items-center bg-blue-500/15 text-blue-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-widest">
            🏆 Vibe2Ship Hackathon
          </span>

          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight leading-tight ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
            {t('hero_title')}
          </h2>

          <p className={`text-xs md:text-sm leading-relaxed font-normal ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
            {t('hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row space-y-2.5 sm:space-y-0 sm:space-x-3 pt-2">
            <button
              id="landing-btn-report"
              onClick={() => onNavigate('report')}
              className="bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-transform active:scale-98 border border-blue-500"
            >
              <Camera className="w-4 h-4" />
              <span>{t('report_an_issue')}</span>
            </button>

            <button
              id="landing-btn-map"
              onClick={() => onNavigate('map')}
              className={`backdrop-blur-md font-bold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 transition-transform active:scale-98 border ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
              }`}
            >
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>{t('view_live_map')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5" id="stats-dashboard">
        {/* Stat 1 */}
        <div className={`border rounded-2xl p-4 flex items-center space-x-3 shadow-sm min-w-0 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold truncate uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('total_active_issues')}</p>
            <p className={`text-lg font-extrabold mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{activeIssues.length}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className={`border rounded-2xl p-4 flex items-center space-x-3 shadow-sm min-w-0 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold truncate uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('issues_resolved')}</p>
            <p className={`text-lg font-extrabold mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{resolvedIssues.length}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className={`border rounded-2xl p-4 flex items-center space-x-3 shadow-sm min-w-0 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold truncate uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('active_heroes')}</p>
            <p className={`text-lg font-extrabold mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{activeCitizens}</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className={`border rounded-2xl p-4 flex items-center space-x-3 shadow-sm min-w-0 transition-colors duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10 backdrop-blur-md'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[9px] font-bold truncate uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{t('sla_compliance')}</p>
            <p className={`text-lg font-extrabold mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{slaPercentage}%</p>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration Banner */}
      <div
        id="whatsapp-promo"
        onClick={() => onNavigate('whatsapp')}
        className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer group transition-all duration-300 backdrop-blur-md ${
          theme === 'light'
            ? 'bg-emerald-50/60 border-emerald-200/80 hover:bg-emerald-100/60'
            : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4 fill-emerald-500 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-300">WhatsApp Chatbot Enabled!</h4>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-200/70 mt-0.5 font-medium">Snap a photo and report directly via WhatsApp in 5 languages.</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* Recent Issues Section */}
      <div className="space-y-3">
        <h3 className={`text-xs font-extrabold uppercase tracking-widest ${theme === 'light' ? 'text-slate-500' : 'text-slate-300'}`}>
          {t('recent_reports')}
        </h3>

        <div className="space-y-3" id="issues-list">
          {issues.length === 0 ? (
            <div className={`text-center py-10 border rounded-2xl ${
              theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-800/20 border-slate-850'
            }`}>
              <p className="text-xs font-medium">No issues reported yet. Be the first hero!</p>
            </div>
          ) : (
            issues.slice(0, 5).map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onSelect={onSelectIssue}
                theme={theme}
              />
            ))
          )}
        </div>
      </div>

      {/* Portal Entry Quick Buttons */}
      <div className={`flex flex-col space-y-2 border-t pt-6 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <button
          id="btn-admin-panel"
          onClick={onTriggerAdminLogin}
          className={`text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors self-center py-2 ${
            theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-blue-500" />
          <span>Login to Government Officer Portal</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center">
          {t('hackathon_banner')}
        </p>
      </div>
    </div>
  );
}
