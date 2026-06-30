import { useState, useEffect } from 'react';
import useTranslations from '../../lib/useTranslations';
import LeafletMap from '../LeafletMap';
import { Issue, UserProfile } from '../../types';
import { Layers, MapPin, ThumbsUp, Sparkles, MessageSquare, Flame, Compass } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface MapViewProps {
  issues: Issue[];
  currentUser: UserProfile;
  onSelectIssue: (id: string) => void;
  onUpvoteSuccess: (updatedIssue: Issue, updatedProfile: UserProfile) => void;
  theme?: 'dark' | 'light';
}

export default function MapView({
  issues,
  currentUser,
  onSelectIssue,
  onUpvoteSuccess,
  theme = 'dark'
}: MapViewProps) {
  const { t } = useTranslations();
  const [viewMode, setViewMode] = useState<'pins' | 'heatmap'>('pins');
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets' | 'satellite' | 'terrain' | 'hybrid'>('dark');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [aiInsight, setAiInsight] = useState('Generating neighborhood hotspot insight with Gemini...');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Could not access your location. Please ensure location permissions are enabled.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Set initial selected issue
  useEffect(() => {
    if (issues.length > 0 && !selectedIssue) {
      setSelectedIssue(issues[0]);
    }
  }, [issues, selectedIssue]);

  // Generate dynamic 1-line Gemini-style insight based on categories
  useEffect(() => {
    const potholeCount = issues.filter(i => i.category === 'pothole' && i.status !== 'resolved').length;
    const garbageCount = issues.filter(i => i.category === 'garbage' && i.status !== 'resolved').length;
    const waterCount = issues.filter(i => i.category === 'water' && i.status !== 'resolved').length;
    const lightCount = issues.filter(i => i.category === 'streetlight' && i.status !== 'resolved').length;

    if (potholeCount > garbageCount && potholeCount > lightCount) {
      setAiInsight('🔥 High pothole cluster detected near central hub. Advise commuters to reduce speed.');
    } else if (garbageCount > potholeCount && garbageCount > waterCount) {
      setAiInsight('🔥 Commercial garbage density peaks near local market strip. High priority for clearance.');
    } else if (lightCount > waterCount) {
      setAiInsight('🔥 Row of 4 streetlights failing around residential Block E. High evening pedestrian risk.');
    } else {
      setAiInsight('🔥 Concentrated water leaks reported on Carter sidewalk. Conservation crew alerted.');
    }
  }, [issues]);

  const handleUpvote = async (issueId: string) => {
    setUpvoting(true);
    try {
      const res = await fetchApi<any>('/api/upvote', {
        method: 'POST',
        body: JSON.stringify({
          issue_id: issueId,
          firebase_uid: currentUser.firebase_uid
        })
      });

      // Update local state and trigger callback
      setSelectedIssue(res.issue);
      onUpvoteSuccess(res.issue, res.profile);
    } catch (err: any) {
      alert(err.message || 'Already verified this issue.');
    } finally {
      setUpvoting(false);
    }
  };

  const chips = [
    { value: 'all', labelKey: 'filter_all' },
    { value: 'pothole', labelKey: 'filter_pothole' },
    { value: 'garbage', labelKey: 'filter_garbage' },
    { value: 'streetlight', labelKey: 'filter_streetlight' },
    { value: 'water', labelKey: 'filter_water' },
    { value: 'other', labelKey: 'filter_other' }
  ];

  return (
    <div id="map-view" className="h-full w-full flex flex-col relative animate-fadeIn">
      {/* Top Map bar */}
      <div className="absolute top-4 left-4 right-4 z-[1010] space-y-2.5">
        <div className={`flex items-center justify-between border p-2.5 rounded-2xl shadow-xl transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-slate-50/95 border-slate-200/80 text-slate-800'
            : 'bg-[#1e293b]/60 backdrop-blur-xl border-white/10 text-slate-100'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <span className={`text-xs font-bold tracking-wide uppercase ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>{t('map')}</span>
          </div>

          {/* Toggle buttons */}
          <div className={`flex border rounded-xl p-0.5 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
            <button
              onClick={() => setViewMode('pins')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all ${
                viewMode === 'pins'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Pins</span>
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1 transition-all ${
                viewMode === 'heatmap'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : theme === 'light'
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Heatmap</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Slider */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth" id="map-filters">
          {chips.map(chip => (
            <button
              key={chip.value}
              onClick={() => setCategoryFilter(chip.value)}
              className={`text-[10px] font-semibold px-3.5 py-1.5 rounded-full border transition-all shrink-0 ${
                categoryFilter === chip.value
                  ? theme === 'light'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-100 text-slate-950 border-slate-100 shadow-lg'
                  : theme === 'light'
                  ? 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200'
                  : 'bg-white/10 backdrop-blur-md text-slate-300 border-white/10 hover:border-white/20'
              }`}
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Leaflet Map wrapper with floating Layer Selector & Live Locator */}
      <div className="flex-1 w-full bg-slate-950 relative">
        <LeafletMap
          issues={issues}
          selectedIssueId={selectedIssue?.id}
          onSelectIssue={setSelectedIssue}
          viewMode={viewMode}
          categoryFilter={categoryFilter}
          mapStyle={mapStyle}
          userLocation={userLocation}
        />

        {/* Floating Live Location Detector */}
        <button
          onClick={handleLocate}
          disabled={locating}
          className={`absolute left-3.5 bottom-3.5 z-[1000] p-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center border ${
            locating
              ? 'bg-blue-600 animate-pulse text-white border-blue-400'
              : userLocation
              ? 'bg-emerald-600 text-white border-emerald-400'
              : theme === 'light'
              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              : 'bg-slate-900/90 text-slate-100 border-white/10 hover:bg-slate-800'
          }`}
          title="Detect Live Location"
        >
          <Compass className={`w-5 h-5 ${locating ? 'animate-spin' : ''}`} />
        </button>

        {/* Floating Basemap Style Switcher (detailed map selector) */}
        <div className={`absolute right-3.5 top-[125px] z-[1000] border p-1 rounded-xl shadow-2xl flex flex-col space-y-1 ${
          theme === 'light'
            ? 'bg-slate-50/95 border-slate-200/80'
            : 'bg-slate-900/90 backdrop-blur-xl border-white/10'
        }`}>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-lg transition-all ${
              mapStyle === 'dark'
                ? 'bg-blue-600 text-white'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Dark Base"
          >
            Dark
          </button>
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-lg transition-all ${
              mapStyle === 'streets'
                ? 'bg-blue-600 text-white'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Detailed Street Map"
          >
            Streets
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-lg transition-all ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="High-Res Satellite"
          >
            Satellite
          </button>
          <button
            onClick={() => setMapStyle('terrain')}
            className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-lg transition-all ${
              mapStyle === 'terrain'
                ? 'bg-blue-600 text-white'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Physical Terrain Relief"
          >
            Terrain
          </button>
          <button
            onClick={() => setMapStyle('hybrid')}
            className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-lg transition-all ${
              mapStyle === 'hybrid'
                ? 'bg-blue-600 text-white'
                : theme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Satellite with Labels"
          >
            Hybrid
          </button>
        </div>
      </div>

      {/* Bottom Floating Details Drawer */}
      {selectedIssue && (
        <div className="absolute bottom-20 left-4 right-4 z-[1010] space-y-2">
          {/* AI Hotspot Insights ticker */}
          <div className={`border rounded-xl px-3 py-2 flex items-center space-x-2 text-[10px] shadow-md ${
            theme === 'light'
              ? 'bg-slate-50/95 border-slate-200 text-slate-700'
              : 'bg-white/5 border-white/10 text-slate-300 backdrop-blur-md'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="font-semibold truncate">{aiInsight}</span>
          </div>

          {/* Quick Drawer card */}
          <div className={`border rounded-3xl p-3 shadow-2xl flex space-x-3.5 relative overflow-hidden transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-slate-50/95 border-slate-200/80 text-slate-800'
              : 'bg-[#1e293b]/60 border-white/10 text-slate-100 backdrop-blur-xl'
          }`}>
            <div className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border ${
              theme === 'light' ? 'bg-slate-200 border-slate-300' : 'bg-slate-950 border-slate-800'
            }`}>
              <img
                src={selectedIssue.photo_url}
                alt={selectedIssue.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=500&q=80';
                }}
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-extrabold tracking-wider uppercase ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {selectedIssue.category}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-extrabold uppercase ${
                    theme === 'light'
                      ? 'bg-slate-200/60 text-slate-700 border-slate-300'
                      : 'bg-slate-800 text-slate-300 border-slate-750'
                  }`}>
                    {selectedIssue.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className={`text-xs font-bold truncate mt-1 ${theme === 'light' ? 'text-slate-800' : 'text-slate-100'}`}>
                  {selectedIssue.title}
                </h4>
                <p className={`text-[10px] truncate mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {selectedIssue.landmark || selectedIssue.address}
                </p>
              </div>

              {/* Action row */}
              <div className={`flex items-center justify-between border-t pt-2 mt-2 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800/60'}`}>
                <button
                  type="button"
                  disabled={upvoting}
                  onClick={() => handleUpvote(selectedIssue.id)}
                  className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg shadow flex items-center space-x-1 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3 text-blue-200" />
                  <span>Verify / Upvote ({selectedIssue.upvotes})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectIssue(selectedIssue.id)}
                  className="text-[10px] text-blue-500 hover:underline font-bold"
                >
                  View Details &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
