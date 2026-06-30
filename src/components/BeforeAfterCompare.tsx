import { CheckCircle2, ShieldCheck, ArrowRightLeft } from 'lucide-react';

interface BeforeAfterCompareProps {
  originalUrl: string;
  resolvedUrl: string;
  aiAnalysis?: string;
  resolvedAt?: string;
}

export default function BeforeAfterCompare({
  originalUrl,
  resolvedUrl,
  aiAnalysis,
  resolvedAt
}: BeforeAfterCompareProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden p-4 space-y-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase">Before & After Repair</h4>
        </div>
        {resolvedAt && (
          <span className="text-[10px] text-slate-500 font-mono">
            Fixed: {new Date(resolvedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 relative">
        {/* Before */}
        <div className="space-y-1.5 group relative">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 relative shadow-inner">
            <img
              src={originalUrl}
              alt="Before civic repair"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=500&q=80';
              }}
            />
            <span className="absolute bottom-2 left-2 bg-red-600/90 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded backdrop-blur-sm shadow-sm tracking-widest border border-red-500/30">
              BEFORE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-medium">Original Issue</p>
        </div>

        {/* After */}
        <div className="space-y-1.5 group relative">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-white/5 border border-emerald-500/20 relative shadow-inner ring-2 ring-emerald-500/10">
            <img
              src={resolvedUrl}
              alt="After civic repair"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&q=80&w=600';
              }}
            />
            <span className="absolute bottom-2 left-2 bg-emerald-600/90 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded backdrop-blur-sm shadow-sm tracking-widest border border-emerald-500/30">
              AFTER
            </span>
          </div>
          <p className="text-[10px] text-emerald-400 text-center font-bold">Resolved Spot</p>
        </div>
      </div>

      {/* AI Verdict Box */}
      {aiAnalysis && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2.5 backdrop-blur-md">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-emerald-300 flex items-center">
              Gemini Vision Resolution Verdict
              <CheckCircle2 className="w-3.5 h-3.5 ml-1 text-emerald-400" />
            </p>
            <p className="text-[10px] text-emerald-200/90 leading-relaxed italic">
              "{aiAnalysis}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
