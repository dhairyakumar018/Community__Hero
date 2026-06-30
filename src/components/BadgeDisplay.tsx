import React from 'react';
import { Award, Zap, Camera, CheckCircle, Flame, ShieldAlert } from 'lucide-react';

interface BadgeDisplayProps {
  userBadges: string[];
}

interface BadgeItem {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  glowColor: string;
}

const BADGES_CONFIG: Record<string, BadgeItem> = {
  'Welcome Hero': {
    name: 'Welcome Hero',
    description: 'Joined the community and pledged to help resolve local civic issues.',
    icon: Zap,
    color: 'from-amber-400 to-orange-500 text-white',
    glowColor: 'shadow-orange-500/30'
  },
  'First Reporter': {
    name: 'First Reporter',
    description: 'Reported your very first civic issue for municipal remediation.',
    icon: Camera,
    color: 'from-blue-400 to-indigo-500 text-white',
    glowColor: 'shadow-indigo-500/30'
  },
  'Verifier': {
    name: 'Verifier',
    description: 'Helped verify and upvote 10 or more reports logged by neighboring heroes.',
    icon: CheckCircle,
    color: 'from-emerald-400 to-teal-500 text-white',
    glowColor: 'shadow-emerald-500/30'
  },
  'Local Hero': {
    name: 'Local Hero',
    description: 'Successfully fixed and resolved 5 civic issues with AI photo confirmation.',
    icon: Award,
    color: 'from-purple-400 to-pink-500 text-white',
    glowColor: 'shadow-purple-500/30'
  },
  'Streak Master': {
    name: 'Streak Master',
    description: 'Maintained a 7-day active usage streak of reporting or verifying issues.',
    icon: Flame,
    color: 'from-red-400 to-rose-500 text-white',
    glowColor: 'shadow-rose-500/30'
  }
};

export default function BadgeDisplay({ userBadges }: BadgeDisplayProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="badges-grid">
      {Object.entries(BADGES_CONFIG).map(([key, badge]) => {
        const isUnlocked = userBadges.includes(key);
        const IconComponent = badge.icon;
        
        return (
          <div
            key={key}
            className={`flex items-center space-x-3 p-3 rounded-xl border transition-all duration-300 backdrop-blur-md ${
              isUnlocked
                ? `bg-white/10 border-white/15 shadow-md ${badge.glowColor}`
                : 'bg-white/5 border-white/5 opacity-50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-tr shadow-sm ${
                isUnlocked ? badge.color : 'from-slate-800 to-slate-700 text-slate-500'
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <p className="text-xs font-bold text-slate-100 truncate">{badge.name}</p>
                {!isUnlocked && (
                  <span className="text-[9px] bg-white/5 text-slate-400 px-1.5 py-0.5 rounded-full border border-white/5">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-normal mt-0.5 mt-1">
                {badge.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export { BADGES_CONFIG };
