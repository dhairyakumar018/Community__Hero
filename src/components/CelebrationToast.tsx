import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Award, Star, X } from 'lucide-react';

interface CelebrationToastProps {
  points?: number | null;
  badgeName?: string | null;
  onClose: () => void;
}

export default function CelebrationToast({ points, badgeName, onClose }: CelebrationToastProps) {
  useEffect(() => {
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!points && !badgeName) return null;

  return (
    <div className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="pointer-events-auto bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-500/20 overflow-hidden relative"
        >
          {/* Sparkles background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />

          <div className="p-4 flex items-start space-x-3.5 relative z-10">
            {/* Animated Icon Container */}
            <div className="shrink-0">
              {badgeName ? (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                  <Award className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Trophy className="w-6 h-6 text-white animate-bounce" />
                </div>
              )}
            </div>

            {/* Content text */}
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="text-sm font-extrabold text-slate-100 flex items-center tracking-tight">
                {badgeName ? 'NEW BADGE UNLOCKED!' : 'CIVIC HERO BONUS!'}
                <span className="ml-1.5 flex space-x-0.5">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </span>
              </h4>
              
              {badgeName && (
                <p className="text-xs font-bold text-amber-300 mt-0.5 uppercase tracking-wide">
                  "{badgeName}" Badge
                </p>
              )}
              
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                {badgeName 
                  ? `Congratulations! You've earned the prestigous "${badgeName}" badge along with +20 bonus points.`
                  : `Incredible work! You just earned +${points} points for validating and supporting civic remediation.`
                }
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="shrink-0 text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Golden bottom glow line */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-amber-400 to-indigo-600" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
