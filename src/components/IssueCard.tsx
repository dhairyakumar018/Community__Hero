import { Issue } from '../types';
import { MapPin, ThumbsUp, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import useTranslations from '../lib/useTranslations';

interface IssueCardProps {
  key?: string | number;
  issue: Issue;
  onSelect: (issueId: string) => void;
  theme?: 'dark' | 'light';
}

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  pothole: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/20', hex: '#ef4444' },
  garbage: { bg: 'bg-orange-500/10', text: 'text-orange-500 dark:text-orange-400', border: 'border-orange-500/20', hex: '#f97316' },
  streetlight: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/20', hex: '#eab308' },
  water: { bg: 'bg-blue-500/10', text: 'text-blue-500 dark:text-blue-400', border: 'border-blue-500/20', hex: '#3b82f6' },
  other: { bg: 'bg-purple-500/10', text: 'text-purple-500 dark:text-purple-400', border: 'border-purple-500/20', hex: '#8b5cf6' }
};

export const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
  reported: { labelKey: 'status_reported', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600/50' },
  investigating: { labelKey: 'status_investigating', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  in_progress: { labelKey: 'status_in_progress', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  resolved: { labelKey: 'status_resolved', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  duplicate: { labelKey: 'status_duplicate', color: 'bg-slate-200 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50' }
};

export default function IssueCard({ issue, onSelect, theme = 'dark' }: IssueCardProps) {
  const { t } = useTranslations();
  
  const colors = CATEGORY_COLORS[issue.category] || CATEGORY_COLORS.other;
  const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.reported;

  return (
    <div
      id={`issue-card-${issue.id}`}
      onClick={() => onSelect(issue.id)}
      className={`border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 cursor-pointer group flex flex-col md:flex-row backdrop-blur-md ${
        theme === 'light'
          ? 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
          : 'bg-white/5 hover:bg-white/10 border-white/10'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-full md:w-36 h-36 md:h-auto shrink-0 bg-slate-900 overflow-hidden">
        <img
          src={issue.photo_url}
          alt={issue.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=500&q=80';
          }}
        />
        {/* Severity overlay */}
        {issue.severity === 'high' && (
          <span className="absolute top-2 left-2 bg-red-600 text-white font-semibold text-[9px] px-1.5 py-0.5 rounded flex items-center space-x-1 shadow-sm">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>CRITICAL</span>
          </span>
        )}
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {/* Tag + Status row */}
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {t(`filter_${issue.category}`)}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
              {t(statusCfg.labelKey)}
            </span>
          </div>

          <h4 className={`text-sm font-bold group-hover:text-blue-500 transition-colors line-clamp-1 pr-6 relative ${
            theme === 'light' ? 'text-slate-800' : 'text-slate-100'
          }`}>
            {issue.title}
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-500 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200" />
          </h4>

          <p className={`text-xs line-clamp-2 leading-relaxed ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {issue.description}
          </p>
        </div>

        {/* Footer meta row */}
        <div className={`flex items-center justify-between border-t pt-2 text-[10px] font-medium ${
          theme === 'light' ? 'border-slate-100 text-slate-500' : 'border-white/5 text-slate-400'
        }`}>
          <div className="flex items-center space-x-1 truncate max-w-[180px]">
            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="truncate">{issue.landmark || issue.address}</span>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <span className={`flex items-center space-x-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
              <ThumbsUp className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              <span>{issue.upvotes}</span>
            </span>
            <span className={`flex items-center space-x-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(issue.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
