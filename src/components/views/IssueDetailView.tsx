import React, { useState, useEffect } from 'react';
import useTranslations from '../../lib/useTranslations';
import { Issue, UserProfile } from '../../types';
import { ArrowLeft, ThumbsUp, MapPin, Calendar, Clock, AlertTriangle, Sparkles, CheckCircle2, Upload, Lock } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import BeforeAfterCompare from '../BeforeAfterCompare';

interface IssueDetailViewProps {
  issueId: string;
  currentUser: UserProfile;
  issues: Issue[];
  onBack: () => void;
  onUpdateIssue: (updatedIssue: Issue, updatedProfile: UserProfile) => void;
}

const AFTER_PRESET_PHOTOS = [
  { name: 'Fixed Road 🛣️', url: 'https://images.unsplash.com/photo-1594814152914-df741639f28d?auto=format&fit=crop&q=80&w=600' },
  { name: 'Cleaned Spot ✨', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600' },
  { name: 'Shining Lamp 💡', url: 'https://images.unsplash.com/photo-1481018085669-0bc7e4597c7e?auto=format&fit=crop&q=80&w=600' },
  { name: 'Repaired Pipe 🔧', url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600' }
];

export default function IssueDetailView({
  issueId,
  currentUser,
  issues,
  onBack,
  onUpdateIssue
}: IssueDetailViewProps) {
  const { t } = useTranslations();
  const [issue, setIssue] = useState<Issue | null>(null);
  
  // Resolution states
  const [resolvingMode, setResolvingMode] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [error, setError] = useState('');

  // Load active issue details
  useEffect(() => {
    const target = issues.find(i => i.id === issueId);
    if (target) {
      setIssue(target);
    }
  }, [issueId, issues]);

  if (!issue) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        Loading issue ticket details...
      </div>
    );
  }

  // Calculate dynamic SLA text
  const getSlaMeta = () => {
    if (issue.status === 'resolved') return { label: 'SLA Succeeded', color: 'text-emerald-400' };
    const deadline = new Date(issue.sla_deadline);
    const now = new Date();
    const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining < 0) {
      return { label: 'SLA Overdue', color: 'text-red-400 font-bold' };
    }
    return { label: `${hoursRemaining} hours left`, color: 'text-blue-400' };
  };

  const slaMeta = getSlaMeta();

  const handleUpvote = async () => {
    setUpvoting(true);
    setError('');
    try {
      const res = await fetchApi<any>('/api/upvote', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: issue.id,
          firebase_uid: currentUser.firebase_uid
        })
      });
      setIssue(res.issue);
      onUpdateIssue(res.issue, res.profile);
    } catch (err: any) {
      setError(err.message || 'Verification upvote failed.');
    } finally {
      setUpvoting(false);
    }
  };

  const handleAfterPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAfterPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyResolution = async () => {
    if (!afterPhoto) {
      setError('Please provide a photo of the completed repair.');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const res = await fetchApi<any>('/api/resolve', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: issue.id,
          after_photo: afterPhoto,
          firebase_uid: currentUser.firebase_uid
        })
      });

      setResolvingMode(false);
      setIssue(res.issue);
      onUpdateIssue(res.issue, res.profile);
    } catch (err: any) {
      setError(err.message || 'AI Verification failed. Ensure photo resembles the original location.');
    } finally {
      setVerifying(false);
    }
  };

  const timelineSteps = [
    { key: 'reported', labelKey: 'status_reported', date: issue.created_at },
    { key: 'investigating', labelKey: 'status_investigating', date: issue.updated_at },
    { key: 'in_progress', labelKey: 'status_in_progress', date: issue.updated_at },
    { key: 'resolved', labelKey: 'status_resolved', date: issue.resolved_at }
  ];

  // Map state to timeline index
  const getActiveTimelineStep = () => {
    const map: Record<string, number> = {
      reported: 0,
      investigating: 1,
      in_progress: 2,
      resolved: 3,
      duplicate: 0
    };
    return map[issue.status] ?? 0;
  };

  const activeStepIdx = getActiveTimelineStep();

  return (
    <div id="issue-detail-view" className="max-w-md mx-auto space-y-6 pb-24 animate-fadeIn">
      {/* Back Button / Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-850"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>
        <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono">
          TICKET #{issue.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {error && (
        <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* BEFORE / AFTER Comparison Block */}
      {issue.status === 'resolved' && issue.resolved_photo_url ? (
        <BeforeAfterCompare
          originalUrl={issue.photo_url}
          resolvedUrl={issue.resolved_photo_url}
          aiAnalysis={issue.ai_verdict}
          resolvedAt={issue.resolved_at}
        />
      ) : (
        /* Unresolved Main Thumbnail Card */
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg group">
          <img
            src={issue.photo_url}
            alt={issue.title}
            className="w-full h-full object-cover group-hover:scale-101 transition-transform"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=500&q=80';
            }}
          />
          {issue.severity === 'high' && (
            <span className="absolute top-3 left-3 bg-red-600 text-white font-mono font-extrabold text-[9px] px-2.5 py-1 rounded-md border border-red-500 shadow-lg tracking-widest">
              HIGH SEVERITY
            </span>
          )}
        </div>
      )}

      {/* Main Metadata Grid */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {t(`filter_${issue.category}`)}
          </span>
          <h3 className="text-base font-extrabold text-slate-100">{issue.title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-normal">{issue.description}</p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-3">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Department SLA</span>
            <div className="flex items-center space-x-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className={`font-mono text-[11px] ${slaMeta.color}`}>{slaMeta.label}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{t('address')}</span>
            <div className="flex items-center space-x-1.5 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{issue.landmark || issue.address}</span>
            </div>
          </div>
        </div>

        {/* Date Row */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2.5">
          <span className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Reported: {new Date(issue.created_at).toLocaleDateString()}</span>
          </span>
          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-400 font-medium">
            SLA SLA: {issue.assigned_department}
          </span>
        </div>
      </div>

      {/* Progress Timeline Tracker */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 shadow-xl space-y-4 backdrop-blur-md">
        <h4 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">{t('timeline')}</h4>

        <div className="space-y-4">
          {timelineSteps.map((step, idx) => {
            const isCompleted = idx <= activeStepIdx;
            const isActive = idx === activeStepIdx;

            return (
              <div key={step.key} className="flex items-start space-x-3.5 relative">
                {/* Visual Line */}
                {idx < 3 && (
                  <div
                    className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 ${
                      idx < activeStepIdx ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                    style={{ height: '24px' }}
                  />
                )}

                {/* Node circle */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Step labels */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={`text-xs font-extrabold ${isCompleted ? 'text-slate-100' : 'text-slate-500'}`}>
                    {t(step.labelKey)}
                  </p>
                  {isCompleted && (
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {step.date ? new Date(step.date).toLocaleString() : 'Done'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action panel panel */}
      {issue.status !== 'resolved' && (
        <div className="space-y-3 pt-2">
          {/* Main Action buttons row */}
          {!resolvingMode ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-detail-upvote"
                type="button"
                disabled={upvoting}
                onClick={handleUpvote}
                className="bg-white/5 hover:bg-white/10 text-blue-400 border border-white/10 font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-1.5 active:scale-98 backdrop-blur-sm"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Verify / Upvote ({issue.upvotes})</span>
              </button>

              <button
                id="btn-trigger-resolve"
                type="button"
                onClick={() => setResolvingMode(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-1.5 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>I Resolved This! (+50)</span>
              </button>
            </div>
          ) : (
            /* Citizen Proof-of-Resolution Form Form */
            <div className="bg-white/5 border border-emerald-500/20 rounded-3xl p-5 space-y-4 shadow-2xl relative backdrop-blur-md">
              {verifying && (
                /* Scanning Loading Screen overlay */
                <div className="absolute inset-0 bg-slate-950/95 rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fadeIn">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="absolute inset-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Sparkles className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-xs font-bold text-slate-100">{t('checking_resolution')}</h4>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      Gemini Vision is comparing Before & After photo matrices to verify the issue has been successfully repaired and cleaned up.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center space-x-1.5 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Verify Local Repair</span>
                </h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Provide a picture of the fixed spot. Gemini will compare it with the original and instantly award you <strong className="text-white">+50 bonus points</strong>!
                </p>
              </div>

              {/* After Photo Input Frame */}
              <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 hover:border-emerald-500/60 bg-white/5 overflow-hidden relative group transition-colors flex items-center justify-center shadow-inner backdrop-blur-md">
                {afterPhoto ? (
                  <>
                    <img src={afterPhoto} alt="Fixed spot preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setAfterPhoto(null)}
                      className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-slate-950 text-white text-[9px] px-2.5 py-1 rounded border border-slate-700"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer p-4 w-full h-full flex flex-col items-center justify-center text-center space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-slate-750 group-hover:text-emerald-400 transition-colors">
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">Upload "After Photo"</p>
                    <p className="text-[9px] text-slate-500">Tap to snap or upload proof</p>
                    <input
                      id="after-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAfterPhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Quick Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {AFTER_PRESET_PHOTOS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAfterPhoto(p.url)}
                      className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 px-2 py-1 rounded-lg text-[10px] font-medium"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form buttons buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setResolvingMode(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs py-2 rounded-xl transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  id="btn-verify-repair"
                  type="button"
                  onClick={handleVerifyResolution}
                  disabled={!afterPhoto}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl shadow-lg transition-colors disabled:opacity-40"
                >
                  Verify Repair (+50)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
