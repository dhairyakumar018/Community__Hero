import React, { useState, useEffect } from 'react';
import useTranslations from '../../lib/useTranslations';
import { Camera, MapPin, Upload, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { Issue, UserProfile } from '../../types';

interface ReportViewProps {
  currentUser: UserProfile;
  onReportSuccess: (data: { issue: Issue; profile: UserProfile; badgeEarned?: string }) => void;
  onNavigate: (page: string) => void;
}

const PRESET_PHOTOS = [
  {
    name: 'Pothole 🕳️',
    url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600',
    landmark: 'Near Bus Depot, Usman Road',
    category: 'pothole',
    lat: 13.0418,
    lng: 80.2337,
    address: 'Usman Road, T. Nagar, Chennai, Tamil Nadu 600017'
  },
  {
    name: 'Garbage Pile 🗑️',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
    landmark: 'Behind Metro Station, Indiranagar',
    category: 'garbage',
    lat: 12.9719,
    lng: 77.6412,
    address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038'
  },
  {
    name: 'Broken Streetlight 💡',
    url: 'https://images.unsplash.com/photo-1509143139826-657a799a629b?auto=format&fit=crop&q=80&w=600',
    landmark: 'E Block Inner Ring',
    category: 'streetlight',
    lat: 28.6304,
    lng: 77.2177,
    address: 'Outer Circle, Connaught Place, New Delhi, Delhi 110001'
  },
  {
    name: 'Water Leakage 💧',
    url: 'https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600',
    landmark: 'Opposite Coffee Shop, Carter Road',
    category: 'water',
    lat: 19.0596,
    lng: 72.8295,
    address: 'Carter Road, Bandra West, Mumbai, Maharashtra 400050'
  }
];

export default function ReportView({ currentUser, onReportSuccess, onNavigate }: ReportViewProps) {
  const { t } = useTranslations();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Duplicate states
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    duplicateIssue: Issue;
    confidence: number;
    reasoning: string;
  } | null>(null);

  // Auto-detect geolocation on load
  useEffect(() => {
    handleDetectLocation();
  }, []);

  const handleDetectLocation = () => {
    setDetectingLoc(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);

          // Call Nominatim Reverse Geocoding
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (res.ok) {
              const data = await res.json();
              setAddress(data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
            } else {
              setAddress(`Detected Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch {
            setAddress(`Detected Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
          setDetectingLoc(false);
        },
        () => {
          // Fallback to Chennai location if blocked
          setLatitude(13.0418);
          setLongitude(80.2337);
          setAddress('Usman Road, T. Nagar, Chennai, Tamil Nadu 600017');
          setDetectingLoc(false);
        }
      );
    } else {
      setLatitude(13.0418);
      setLongitude(80.2337);
      setAddress('Usman Road, T. Nagar, Chennai, Tamil Nadu 600017');
      setDetectingLoc(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof PRESET_PHOTOS[0]) => {
    setPhotoUrl(preset.url);
    setLandmark(preset.landmark);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setAddress(preset.address);
  };

  const submitReport = async (bypassDuplicate: boolean = false) => {
    if (!photoUrl) {
      setError('Please provide a photo of the civic issue.');
      return;
    }
    if (!latitude || !longitude) {
      setError('Unable to submit without coordinate location.');
      return;
    }

    setError('');
    setAnalyzing(true);

    try {
      const res = await fetchApi<any>('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          firebase_uid: currentUser.firebase_uid,
          image: photoUrl,
          latitude,
          longitude,
          address,
          landmark,
          bypassDuplicateCheck: bypassDuplicate
        })
      });

      if (res.duplicateFound) {
        // Trigger duplicate alert modal
        setDuplicateInfo({
          duplicateIssue: res.duplicateIssue,
          confidence: res.confidence,
          reasoning: res.reasoning
        });
        setDuplicateModalOpen(true);
        setAnalyzing(false);
      } else {
        // Clear inputs & execute success callback
        setDuplicateModalOpen(false);
        onReportSuccess({
          issue: res.issue,
          profile: res.profile,
          badgeEarned: res.profile.badges.length > currentUser.badges.length ? res.profile.badges[res.profile.badges.length - 1] : undefined
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
      setAnalyzing(false);
    }
  };

  const handleUpvoteDuplicate = async () => {
    if (!duplicateInfo) return;
    setDuplicateModalOpen(false);
    setAnalyzing(true);
    
    try {
      const res = await fetchApi<any>('/api/upvote', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: duplicateInfo.duplicateIssue.id,
          firebase_uid: currentUser.firebase_uid
        })
      });

      onReportSuccess({
        issue: res.issue,
        profile: res.profile,
        badgeEarned: res.profile.badges.length > currentUser.badges.length ? res.profile.badges[res.profile.badges.length - 1] : undefined
      });
    } catch (err: any) {
      setError(err.message || 'Upvote failed.');
      setAnalyzing(false);
    }
  };

  return (
    <div id="report-view" className="max-w-md mx-auto space-y-5 pb-24 animate-fadeIn">
      {/* View Header */}
      <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
        <button onClick={() => onNavigate('landing')} className="text-slate-400 hover:text-slate-200">
          <RefreshCw className="w-4 h-4 rotate-270" />
        </button>
        <div>
          <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">{t('report_an_issue')}</h2>
          <p className="text-[10px] text-slate-400">Powered by Gemini Multi-Stage Vision Pipeline</p>
        </div>
      </div>

      {error && (
        <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-5 shadow-lg relative backdrop-blur-md">
        {analyzing && (
          /* Analyzing Overlay Overlay Screen */
          <div className="absolute inset-0 bg-slate-900/95 rounded-3xl z-30 flex flex-col items-center justify-center p-6 text-center space-y-5 animate-fadeIn">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-blue-500/40 rounded-full animate-pulse" />
              <div className="absolute inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
            </div>
            <div className="space-y-1.5 max-w-xs">
              <h4 className="text-sm font-bold text-slate-100 animate-pulse">{t('analyzing_image')}</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Gemini 3.5 Flash is inspecting physical pixel signatures, verifying category type, grading safety severity, and doing duplicate check checks.
              </p>
            </div>
          </div>
        )}

        {/* Photo input frame */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>{t('upload_photo')}</span>
            <span className="text-blue-400 font-bold">{photoUrl ? 'Captured ✓' : 'Required'}</span>
          </label>
          
          <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/60 bg-white/5 overflow-hidden relative group transition-colors shadow-inner flex items-center justify-center backdrop-blur-md">
            {photoUrl ? (
              <>
                <img src={photoUrl} alt="Issue submission Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-slate-950 text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10"
                >
                  Clear Photo
                </button>
              </>
            ) : (
              <label className="cursor-pointer p-4 w-full h-full flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-slate-750 group-hover:text-blue-400 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-300">{t('upload_photo')}</p>
                  <p className="text-[10px] text-slate-500">{t('upload_hint')}</p>
                </div>
                <input
                  id="camera-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Instant test presets section */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Judge Tool: Instant Presets</span>
          </span>
          <div className="flex flex-wrap gap-2" id="preset-buttons">
            {PRESET_PHOTOS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 active:scale-95 transition-all"
              >
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Landmark entry */}
        <div className="space-y-1">
          <label htmlFor="landmark-input" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('landmark')}</label>
          <input
            id="landmark-input"
            type="text"
            placeholder="e.g. Next to Saravana Stores gate"
            value={landmark}
            onChange={e => setLandmark(e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Coordinates/Address locator card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-start space-x-3 backdrop-blur-md">
          <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('address')}</span>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLoc}
                className="text-[9px] text-blue-400 hover:underline font-bold"
              >
                {detectingLoc ? 'Locating...' : 'Refresh GPS'}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal break-words">
              {address || 'Waiting for coordinates...'}
            </p>
            {latitude && longitude && (
              <p className="text-[9px] text-slate-500 font-mono">
                Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          id="btn-report-submit"
          type="button"
          onClick={() => submitReport(false)}
          disabled={!photoUrl || analyzing}
          className="w-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-transform active:scale-98 disabled:opacity-40 border border-blue-500"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>Analyze & Submit (+10 Points)</span>
        </button>
      </div>

      {/* Duplicate alert popup modal */}
      {duplicateModalOpen && duplicateInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-5 animate-fadeIn">
            {/* Modal Heading */}
            <div className="flex items-center space-x-2.5 text-amber-400 border-b border-slate-850 pb-3">
              <Layers className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-100">{t('duplicate_found')}</h3>
                <p className="text-[9px] text-slate-400">Gemini Duplicate Detector Confidence: {Math.round(duplicateInfo.confidence * 100)}%</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('duplicate_warning')}
            </p>

            {/* Existing ticket card info */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl overflow-hidden flex">
              <div className="w-24 h-24 shrink-0 bg-slate-950">
                <img
                  src={duplicateInfo.duplicateIssue.photo_url}
                  alt={duplicateInfo.duplicateIssue.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 font-bold uppercase">
                    Open Ticket
                  </span>
                  <h4 className="text-xs font-bold text-slate-200 mt-1 truncate">
                    {duplicateInfo.duplicateIssue.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {duplicateInfo.duplicateIssue.landmark || duplicateInfo.duplicateIssue.address}
                  </p>
                </div>
                <div className="text-[9px] text-blue-400 font-bold">
                  Upvotes: {duplicateInfo.duplicateIssue.upvotes}
                </div>
              </div>
            </div>

            {/* Explanation reasoning box */}
            <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-3 text-[10px] text-amber-200/90 leading-relaxed italic">
              "AI reasoning: {duplicateInfo.reasoning}"
            </div>

            {/* Modal Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-duplicate-upvote"
                onClick={handleUpvoteDuplicate}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition-colors"
              >
                Yes, upvote original (+5)
              </button>
              <button
                id="btn-duplicate-force"
                onClick={() => submitReport(true)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition-colors"
              >
                {t('force_submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
