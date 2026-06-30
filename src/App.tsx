import { useState, useEffect } from 'react';
import { UserProfile, Issue } from './types';
import { getCachedProfile, setCachedProfile, getSessionUid, loginAsAdmin, fetchApi } from './lib/api';
import useTranslations from './lib/useTranslations';

// Import Custom Views
import LandingView from './components/views/LandingView';
import LoginView from './components/views/LoginView';
import ReportView from './components/views/ReportView';
import MapView from './components/views/MapView';
import IssueDetailView from './components/views/IssueDetailView';
import LeaderboardView from './components/views/LeaderboardView';
import ProfileView from './components/views/ProfileView';
import AdminView from './components/views/AdminView';
import WhatsAppView from './components/views/WhatsAppView';

// Import Shared Layout Components
import BottomNav from './components/BottomNav';
import CelebrationToast from './components/CelebrationToast';

export default function App() {
  const { t } = useTranslations();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme support: default dark, with toggleable light mode
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('community_hero_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('community_hero_theme', next);
      return next;
    });
  };

  // Nav routing state: 'landing', 'map', 'report', 'leaderboard', 'profile', 'detail', 'admin', 'whatsapp'
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Toast state
  const [toastPoints, setToastPoints] = useState<number | null>(null);
  const [toastBadge, setToastBadge] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Load database and session cache on mount
  useEffect(() => {
    const sessionUid = getSessionUid();
    const cached = getCachedProfile();

    const fetchAllData = async () => {
      try {
        const data = await fetchApi<Issue[]>('/api/reports');
        setIssues(data);

        if (sessionUid && cached) {
          // Verify/Sync active profile on backend
          const syncProfile = await fetchApi<UserProfile>('/api/auth/profile', {
            method: 'POST',
            body: JSON.stringify({
              firebase_uid: sessionUid,
              phone: cached.phone,
              display_name: cached.display_name
            })
          });
          setCurrentUser(syncProfile);
          setCachedProfile(syncProfile);
          
          // Auto-route admin/officers to administrative command center
          if (syncProfile.role && ['super_admin', 'admin', 'ward_officer', 'department_head'].includes(syncProfile.role)) {
            setCurrentPage('admin');
          }
        }
      } catch (err) {
        console.error('Initial fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const refreshDatabase = async () => {
    try {
      const data = await fetchApi<Issue[]>('/api/reports');
      setIssues(data);
    } catch (err) {
      console.error('Database refresh failed:', err);
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setCurrentUser(profile);
    
    // Welcome Bonus check: if they have points === 10 (the default welcome seed), show celebration!
    if (profile.points === 10 && profile.badges.includes('Welcome Hero')) {
      triggerCelebration(null, 'Welcome Hero');
    }
    
    // Direct admin/officers to Command Center; citizens to Landing view
    if (profile.role && ['super_admin', 'admin', 'ward_officer', 'department_head'].includes(profile.role)) {
      setCurrentPage('admin');
    } else {
      setCurrentPage('landing');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCachedProfile(null);
    setCurrentPage('landing');
  };

  const handleAdminBypass = async () => {
    setLoading(true);
    try {
      const adminProfile = await loginAsAdmin();
      setCurrentUser(adminProfile);
      setCurrentPage('admin');
    } catch {
      alert('Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebration = (points: number | null, badgeName: string | null) => {
    setToastPoints(points);
    setToastBadge(badgeName);
    setShowToast(true);
  };

  // Callback on successful report submit or duplicate upvote
  const handleReportSuccess = (data: { issue: Issue; profile: UserProfile; badgeEarned?: string }) => {
    // Add points trigger check
    const pointsDifference = data.profile.points - (currentUser?.points || 0);
    
    // Update local lists
    setIssues(prev => [data.issue, ...prev.filter(i => i.id !== data.issue.id)]);
    setCurrentUser(data.profile);
    setCachedProfile(data.profile);

    // Render rewards celebration
    if (data.badgeEarned) {
      triggerCelebration(pointsDifference > 0 ? pointsDifference : null, data.badgeEarned);
    } else if (pointsDifference > 0) {
      triggerCelebration(pointsDifference, null);
    }

    setCurrentPage('landing');
  };

  // Callback on detail page upvote/resolution updates
  const handleUpdateIssue = (updatedIssue: Issue, updatedProfile: UserProfile) => {
    const pointsDiff = updatedProfile.points - (currentUser?.points || 0);
    const hasNewBadge = updatedProfile.badges.length > (currentUser?.badges.length || 0);
    
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    setCurrentUser(updatedProfile);
    setCachedProfile(updatedProfile);

    // If new badge was unlocked, celebrate that, otherwise celebrate points
    if (hasNewBadge) {
      const newBadgeName = updatedProfile.badges[updatedProfile.badges.length - 1];
      triggerCelebration(pointsDiff > 0 ? pointsDiff : null, newBadgeName);
    } else if (pointsDiff > 0) {
      triggerCelebration(pointsDiff, null);
    }
  };

  const handleSelectDetail = (issueId: string) => {
    setSelectedIssueId(issueId);
    setCurrentPage('detail');
  };

  if (loading) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium text-xs tracking-wider uppercase">Loading Community Hero...</p>
      </div>
    );
  }

  // Enforce authentication login wall for citizen actions except Landing stats view
  const requiresAuth = ['report', 'profile', 'detail'];
  const showLoginWall = requiresAuth.includes(currentPage) && !currentUser;

  // Render view template
  const renderActiveView = () => {
    if (showLoginWall) {
      return <LoginView onLoginSuccess={handleLoginSuccess} theme={theme} />;
    }

    switch (currentPage) {
      case 'landing':
        return (
          <LandingView
            issues={issues}
            onNavigate={setCurrentPage}
            onSelectIssue={handleSelectDetail}
            currentUser={currentUser}
            onTriggerAdminLogin={handleAdminBypass}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        );
      case 'map':
        return (
          <MapView
            issues={issues}
            currentUser={currentUser || { firebase_uid: 'anon', display_name: 'Anonymous', phone: '', points: 0, badges: [], level: 1 }}
            onSelectIssue={handleSelectDetail}
            onUpvoteSuccess={(iss, prof) => handleUpdateIssue(iss, prof)}
            theme={theme}
          />
        );
      case 'report':
        return (
          <ReportView
            currentUser={currentUser!}
            onReportSuccess={handleReportSuccess}
            onNavigate={setCurrentPage}
          />
        );
      case 'detail':
        return (
          <IssueDetailView
            issueId={selectedIssueId!}
            currentUser={currentUser || { firebase_uid: 'anon', display_name: 'Anonymous', phone: '', points: 0, badges: [], level: 1 }}
            issues={issues}
            onBack={() => setCurrentPage('landing')}
            onUpdateIssue={handleUpdateIssue}
          />
        );
      case 'leaderboard':
        return <LeaderboardView theme={theme} />;
      case 'profile':
        return (
          <ProfileView
            currentUser={currentUser!}
            issues={issues}
            onLogout={handleLogout}
            onUpdateUser={setCurrentUser}
            onNavigate={setCurrentPage}
            theme={theme}
          />
        );
      case 'admin':
        return (
          <AdminView
            currentUser={currentUser || { firebase_uid: 'admin', display_name: 'Admin Officer', phone: '', points: 0, badges: [], level: 1 }}
            issues={issues}
            onBackToCitizen={() => setCurrentPage('landing')}
            onRefreshDatabase={refreshDatabase}
          />
        );
      case 'whatsapp':
        return <WhatsAppView onBack={() => setCurrentPage('landing')} />;
      default:
        return <div>View not found</div>;
    }
  };

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200 selection:text-blue-900">
        <AdminView
          currentUser={currentUser}
          issues={issues}
          onBackToCitizen={() => {
            setCurrentPage('landing');
          }}
          onRefreshDatabase={refreshDatabase}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 selection:text-blue-200 relative overflow-x-hidden transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-[#0a0f1e] text-slate-100'
    }`}>
      {/* Decorative Outer Canvas background lights */}
      <div className={`fixed top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none transition-colors duration-300 ${
        theme === 'light' ? 'bg-blue-400/5' : 'bg-blue-600/10'
      }`} />
      <div className={`fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-colors duration-300 ${
        theme === 'light' ? 'bg-emerald-400/5' : 'bg-emerald-600/5'
      }`} />

      {/* Primary Mobile Container Canvas */}
      <main className={`max-w-md mx-auto border-x shadow-2xl relative backdrop-blur-xl transition-all duration-300 ${
        theme === 'light' ? 'bg-slate-55/70 border-slate-200' : 'bg-slate-950/40 border-white/10'
      } ${
        currentPage === 'map'
          ? 'h-screen overflow-hidden flex flex-col pt-0 px-0 pb-16'
          : 'min-h-screen px-4 pt-6 pb-28'
      }`}>
        {renderActiveView()}
      </main>

      {/* Global Floating Bottom Nav Bar */}
      {currentPage !== 'admin' && currentPage !== 'whatsapp' && (
        <BottomNav
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isAdmin={currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'ward_officer' || currentUser?.role === 'department_head'}
          theme={theme}
        />
      )}

      {/* High-Fidelity gamification Celebration popups */}
      {showToast && (
        <CelebrationToast
          points={toastPoints}
          badgeName={toastBadge}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
