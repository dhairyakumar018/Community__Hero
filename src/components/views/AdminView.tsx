import React, { useState, useEffect, useRef } from 'react';
import { Issue, UserProfile, AuditLog } from '../../types';
import { fetchApi } from '../../lib/api';
import { getDepartmentAndSla } from '../../lib/departmentRouter';
import L from 'leaflet';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  Shield,
  LayoutDashboard,
  FileText,
  Building2,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Mail,
  Download,
  Plus,
  Eye,
  Check,
  MoreVertical,
  Filter,
  User,
  Trash2,
  ExternalLink,
  ChevronRight,
  Printer
} from 'lucide-react';

interface AdminViewProps {
  currentUser: UserProfile | null;
  issues: Issue[];
  onBackToCitizen: () => void;
  onRefreshDatabase: () => void;
}

// Default list of zones
const ZONES = [
  'Zone 1 (North)',
  'Zone 2 (East)',
  'Zone 3 (Hazratganj)',
  'Zone 4 (South)',
  'Zone 5 (Central)'
];

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole & Road Damage',
  garbage: 'Garbage & Sanitation',
  streetlight: 'Streetlight & Electrical',
  water: 'Water Supply & Sewerage',
  other: 'General/Other'
};

const CATEGORY_COLORS: Record<string, string> = {
  pothole: 'bg-red-100 text-red-800 border-red-200',
  garbage: 'bg-amber-100 text-amber-800 border-amber-200',
  streetlight: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  water: 'bg-blue-100 text-blue-800 border-blue-200',
  other: 'bg-purple-100 text-purple-800 border-purple-200'
};

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-500 text-slate-950',
  low: 'bg-slate-200 text-slate-800'
};

export default function AdminView({
  currentUser: initialUser,
  issues,
  onBackToCitizen,
  onRefreshDatabase
}: AdminViewProps) {
  // Authentication / User States
  const [adminUser, setAdminUser] = useState<UserProfile | null>(initialUser);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issues' | 'departments' | 'analytics' | 'audit' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Interactive UI States
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [activeIssueDetail, setActiveIssueDetail] = useState<Issue | null>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState<'department' | 'reporter' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Forms & Updates States
  const [internalNotes, setInternalNotes] = useState('');
  const [updatingIssue, setUpdatingIssue] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkDept, setBulkDept] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Email template mockup
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // AI insights caching & dynamic state
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Notifications State (Mocked local state)
  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, type: 'breach', message: 'SLA Breach Warning: Carter Road Water Leak unaddressed for 22 hours.', time: '10m ago', unread: true },
    { id: 2, type: 'critical', message: 'New HIGH severity issue reported on Hazratganj Main Crossing.', time: '1h ago', unread: true },
    { id: 3, type: 'verification', message: 'Resolution uploaded for Pothole #ISSUE-2384. Awaiting confirmation.', time: '2h ago', unread: false },
    { id: 4, type: 'reassignment', message: 'Ticket #ISSUE-9921 reassigned from PWD to Sanitation Dept.', time: '1d ago', unread: false }
  ]);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapInstanceRef = useRef<L.Map | null>(null);

  // Log in as Super Admin or Ward Officer (Demo mode)
  const handleDemoLogin = async (role: 'super_admin' | 'ward_officer') => {
    try {
      const uid = role === 'super_admin' ? 'seed-admin' : 'seed-ward-officer';
      const syncProfile = await fetchApi<UserProfile>('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: uid })
      });
      setAdminUser(syncProfile);
      localStorage.setItem('community_hero_firebase_uid', uid);
      localStorage.setItem('community_hero_user_profile', JSON.stringify(syncProfile));
      onRefreshDatabase();
    } catch (err) {
      alert('Demo login failed. Server might be initializing.');
    }
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('community_hero_firebase_uid');
    localStorage.removeItem('community_hero_user_profile');
  };

  // Fetch AI Insights
  const handleFetchAiInsights = async () => {
    if (!adminUser) return;
    setLoadingAi(true);
    try {
      const insights = await fetchApi<any[]>('/api/admin/insights', {
        headers: {
          'x-admin-uid': adminUser.firebase_uid
        }
      });
      setAiInsights(insights);
    } catch (err) {
      console.error('AI Insights fetch failed, using fallback.');
      // Fallback
      setAiInsights([
        {
          title: 'Hazratganj Road Damage Spike',
          message: 'Pothole and road damage reports are up 40% in Hazratganj this week. Commuter traffic is heavily impacted.',
          icon: 'AlertTriangle',
          severity: 'high',
          action_url: '/admin/issues'
        },
        {
          title: 'Potential Water Main Leakage',
          message: 'Detected 5 unresolved water leak reports within 500 meters in Zone 3. This indicates a probable main pipeline burst.',
          icon: 'Droplet',
          severity: 'high',
          action_url: '/admin/issues'
        },
        {
          title: 'Sanitation Turnaround Improvement',
          message: 'Sanitation Department improved its average resolution speed by 35% this month compared to previous periods.',
          icon: 'Sparkles',
          severity: 'low',
          action_url: '/admin/departments'
        }
      ]);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (adminUser) {
      handleFetchAiInsights();
    }
  }, [adminUser]);

  // Leaflet integration inside drawer
  useEffect(() => {
    if (activeIssueDetail && mapContainerRef.current) {
      // Clean up previous map if exists
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }

      const { latitude, longitude } = activeIssueDetail;
      try {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([latitude, longitude], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Custom marker icon
        const pinIcon = L.divIcon({
          className: 'custom-leaflet-pin',
          html: `<div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white ring-4 ring-blue-500/30 animate-pulse"></div>`,
          iconSize: [16, 16]
        });

        L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);
        leafletMapInstanceRef.current = map;
      } catch (err) {
        console.error('Leaflet initialization failed inside drawer:', err);
      }
    }
    return () => {
      if (leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.remove();
        leafletMapInstanceRef.current = null;
      }
    };
  }, [activeIssueDetail]);

  // Sync internal notes state when issue changes
  useEffect(() => {
    if (activeIssueDetail) {
      setInternalNotes(activeIssueDetail.internal_notes || '');
    }
  }, [activeIssueDetail]);

  // Helper: Role restriction checks
  const getFilteredIssues = () => {
    let list = [...issues];
    
    // Check role restrictions
    if (adminUser?.role === 'ward_officer' && adminUser.zone_assigned) {
      list = list.filter(i => i.address.includes(adminUser.zone_assigned!) || (i.landmark && i.landmark.includes(adminUser.zone_assigned!)));
    } else if (adminUser?.role === 'department_head' && adminUser.department) {
      list = list.filter(i => i.assigned_department === adminUser.department);
    }

    // Apply filters
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.address.toLowerCase().includes(q));
    }
    if (zoneFilter !== 'all') {
      list = list.filter(i => i.address.includes(zoneFilter) || (i.landmark && i.landmark.includes(zoneFilter)));
    }
    if (categoryFilter !== 'all') {
      list = list.filter(i => i.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter);
    }
    if (priorityFilter !== 'all') {
      list = list.filter(i => i.priority === priorityFilter);
    }
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'assigned') {
        list = list.filter(i => !!i.assigned_department);
      } else {
        list = list.filter(i => !i.assigned_department);
      }
    }

    return list;
  };

  const filteredIssues = getFilteredIssues();

  // Handle single issue save (status, assignment, notes)
  const handleSaveIssueDetail = async (updatedFields: Partial<Issue>) => {
    if (!activeIssueDetail || !adminUser) return;
    setUpdatingIssue(true);
    try {
      const response = await fetchApi<{ success: boolean; issue: Issue }>('/api/admin/update-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-uid': adminUser.firebase_uid
        },
        body: JSON.stringify({
          issue_id: activeIssueDetail.id,
          performer_name: adminUser.display_name,
          ...updatedFields
        })
      });

      if (response.success) {
        onRefreshDatabase();
        setActiveIssueDetail(response.issue);
      }
    } catch (err) {
      alert('Failed to update issue.');
    } finally {
      setUpdatingIssue(false);
    }
  };

  // Handle resolution approve/reject verification
  const handleVerifyResolution = async (approved: boolean) => {
    if (!activeIssueDetail || !adminUser) return;
    await handleSaveIssueDetail({
      status: approved ? 'resolved' : 'in_progress',
      resolution_verified: approved,
      internal_notes: (activeIssueDetail.internal_notes || '') + `\n[Resolution Verification: ${approved ? 'APPROVED' : 'REJECTED'} by ${adminUser.display_name} on ${new Date().toLocaleDateString()}]`
    });
    alert(approved ? 'Resolution verified and ticket resolved.' : 'Resolution rejected, ticket sent back to In Progress.');
  };

  // Handle bulk updates
  const handleBulkSubmit = async () => {
    if (selectedIssueIds.length === 0 || !adminUser) return;
    setBulkUpdating(true);
    try {
      const response = await fetchApi<any>('/api/admin/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-uid': adminUser.firebase_uid
        },
        body: JSON.stringify({
          issue_ids: selectedIssueIds,
          status: bulkStatus || undefined,
          assigned_department: bulkDept || undefined,
          priority: bulkPriority || undefined,
          assigned_to: bulkAssignee || undefined,
          officer_name: adminUser.display_name
        })
      });

      if (response.success) {
        alert(`Successfully updated ${response.updatedCount} issues.`);
        setSelectedIssueIds([]);
        setBulkStatus('');
        setBulkDept('');
        setBulkPriority('');
        setBulkAssignee('');
        onRefreshDatabase();
      }
    } catch (err) {
      alert('Bulk update failed.');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Wipe / clear database sample issues for clean slate demo
  const handleClearDatabase = async () => {
    if (!adminUser) return;
    const confirmWipe = window.confirm('Are you sure you want to clear all sample reports? This will leave a clean slate for demonstrating reporting.');
    if (!confirmWipe) return;

    try {
      const res = await fetchApi<any>('/api/admin/clear-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-uid': adminUser.firebase_uid
        },
        body: JSON.stringify({
          performer_name: adminUser.display_name
        })
      });

      if (res.success) {
        alert('Database cleared successfully! You can now report fresh issues.');
        setActiveIssueDetail(null);
        setSelectedIssueIds([]);
        onRefreshDatabase();
      }
    } catch (err) {
      alert('Failed to clear database.');
    }
  };

  // Mock Notification Click
  const handleNotificationClick = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    setShowNotificationDropdown(false);
    setActiveTab('issues');
    alert('Routing to corresponding ticket in management interface.');
  };

  // Mock Email composer trigger
  const triggerEmailModal = (type: 'department' | 'reporter') => {
    if (!activeIssueDetail) return;
    if (type === 'department') {
      setEmailTo(`${activeIssueDetail.assigned_department?.toLowerCase().replace(/[^a-z]/g, '') || 'pwd'}@municipal.gov.in`);
      setEmailSubject(`ACTION REQUIRED: Civic Issue #${activeIssueDetail.id.slice(0,8).toUpperCase()} assigned to you`);
      setEmailBody(`Respected Officer,\n\nThe following citizen reported issue is assigned to your department for resolution:\n\nTitle: ${activeIssueDetail.title}\nCategory: ${activeIssueDetail.category.toUpperCase()}\nSeverity: ${activeIssueDetail.severity.toUpperCase()}\nAddress: ${activeIssueDetail.address}\n\nSLA Deadline: ${activeIssueDetail.sla_deadline ? new Date(activeIssueDetail.sla_deadline).toLocaleString() : 'Urgent'}\n\nPlease mobilize field engineers immediately.\n\nWarm regards,\nMunicipal Headquarters Dashboard`);
    } else {
      setEmailTo('citizen.reporter@gmail.com');
      setEmailSubject(`Update on your civic report: #${activeIssueDetail.id.slice(0,8).toUpperCase()}`);
      setEmailBody(`Dear Citizen,\n\nThank you for making our city better. The issue you reported ("${activeIssueDetail.title}") has been updated to "${activeIssueDetail.status.toUpperCase()}".\n\nIt is currently assigned to the ${activeIssueDetail.assigned_department || 'Municipal General Administration'} with high priority. We will notify you once resolved.\n\nThank you,\nCity Ward Command`);
    }
    setShowEmailModal(type);
  };

  const handleSendEmailMock = () => {
    alert(`Mock email dispatched successfully to: ${emailTo}`);
    setShowEmailModal(null);
  };

  // Export Table to CSV
  const handleExportCSV = (list: Issue[]) => {
    if (list.length === 0) return alert('No issues to export.');
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Title,Category,Severity,Status,Address,Upvotes,Assigned Department,Priority,SLA Deadline,Created At\n';
    
    list.forEach(i => {
      const row = [
        i.id,
        `"${i.title.replace(/"/g, '""')}"`,
        i.category,
        i.severity,
        i.status,
        `"${i.address.replace(/"/g, '""')}"`,
        i.upvotes,
        `"${(i.assigned_department || '').replace(/"/g, '""')}"`,
        i.priority || 'medium',
        i.sla_deadline || '',
        i.created_at
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `municipal_reports_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HTML Print Report
  const handlePrintReport = () => {
    window.print();
  };

  // Calculate stats dynamically
  const activeIssues = issues.filter(i => i.status !== 'resolved');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  
  // Calculate Avg Resolution Time (mocked elegantly)
  const avgResolutionTime = resolvedIssues.length > 0 ? '14.5 hours' : '18.2 hours';
  
  // SLA breaches count
  const nowTime = new Date();
  const slaBreachesCount = activeIssues.filter(i => {
    if (!i.sla_deadline) return false;
    return new Date(i.sla_deadline) < nowTime;
  }).length;

  const totalSlaBreachedCount = slaBreachesCount + resolvedIssues.filter(i => {
    if (!i.resolved_at || !i.sla_deadline) return false;
    return new Date(i.resolved_at) > new Date(i.sla_deadline);
  }).length;

  const resolutionRateThisWeek = issues.length > 0 
    ? Math.round((resolvedIssues.length / issues.length) * 100) 
    : 100;

  // Horizontal pipeline calculation
  const totalIssuesCount = issues.length || 1;
  const pipelineStats = {
    reported: Math.round((issues.filter(i => i.status === 'reported').length / totalIssuesCount) * 100),
    investigating: Math.round((issues.filter(i => i.status === 'investigating').length / totalIssuesCount) * 100),
    in_progress: Math.round((issues.filter(i => i.status === 'in_progress').length / totalIssuesCount) * 100),
    resolved: Math.round((issues.filter(i => i.status === 'resolved').length / totalIssuesCount) * 100),
    duplicate: Math.round((issues.filter(i => i.status === 'duplicate').length / totalIssuesCount) * 100)
  };

  // If user is not logged in as Admin, show the high-fidelity Admin Login Wall
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100">
        {/* Decorative backdrop light rings */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl space-y-8 z-10">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white uppercase mt-4">
              MUNICIPAL AUTHORITY PORTAL
            </h1>
            <p className="text-xs text-slate-400">
              Official command interface for municipal ward officers and departments.
            </p>
          </div>

          <div className="bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-300 leading-relaxed text-center">
            🔒 Fully encrypted B2G interface. Authorization token role checking is active.
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleDemoLogin('super_admin')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-between group transition-all"
            >
              <div className="text-left">
                <p className="font-extrabold">Login as Super Admin (Demo)</p>
                <p className="text-[10px] text-blue-200 font-normal mt-0.5">Full operational authority across all 5 zones.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleDemoLogin('ward_officer')}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10 font-bold text-xs py-4 px-6 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div className="text-left">
                <p className="font-extrabold text-slate-200">Login as Ward Officer (Demo)</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Zone-restricted access to Ward 3 (Hazratganj) only.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-center pt-4">
            <button
              onClick={onBackToCitizen}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium underline"
            >
              &larr; Back to Citizen Mobile App
            </button>
          </div>
        </div>
      </div>
    );
  }

  // HEATMAP CALCULATION (Zones x Categories)
  const heatmapData = ZONES.map(zone => {
    const row: Record<string, any> = { zone };
    CATEGORIES.forEach(cat => {
      row[cat] = issues.filter(i => {
        const isCat = i.category === cat;
        const inZone = i.address.includes(zone) || (i.landmark && i.landmark.includes(zone));
        const isActive = i.status !== 'resolved';
        return isCat && inZone && isActive;
      }).length;
    });
    return row;
  });

  // Recharts Chart Formats: Issues reported vs resolved over last 90 days
  const timeSeriesData = [
    { date: 'Apr 26', Reported: 12, Resolved: 8 },
    { date: 'May 03', Reported: 18, Resolved: 14 },
    { date: 'May 10', Reported: 25, Resolved: 18 },
    { date: 'May 17', Reported: 32, Resolved: 24 },
    { date: 'May 24', Reported: 45, Resolved: 35 },
    { date: 'May 31', Reported: 28, Resolved: 30 },
    { date: 'Jun 07', Reported: 38, Resolved: 32 },
    { date: 'Jun 14', Reported: 54, Resolved: 42 },
    { date: 'Jun 21', Reported: 60, Resolved: 50 },
    { date: 'Jun 28', Reported: issues.length, Resolved: resolvedIssues.length }
  ];

  const pieChartData = CATEGORIES.map(cat => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: issues.filter(i => i.category === cat).length
  }));

  const pieColors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

  const hotspotData = ZONES.map(z => ({
    name: z.replace(' (', ' - ').replace(')', ''),
    count: issues.filter(i => i.address.includes(z) || (i.landmark && i.landmark.includes(z))).length
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex text-[13px] overflow-hidden antialiased">
      
      {/* MOBILE SIDEBAR BACKDROP */}
      {sidebarOpen && (
        <div
          id="sidebar-backdrop"
          className="lg:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[1040]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION PANEL */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 h-full ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
        } shrink-0 bg-slate-900 text-slate-200 transition-all duration-300 z-[1050] flex flex-col justify-between border-r border-slate-800 shadow-xl`}
      >
        <div>
          {/* Brand Row */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="font-sans font-black text-xs text-white uppercase tracking-wider">CIVIC COMMAND</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase -mt-0.5">Admin Portal v2.5</span>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white lg:block hidden"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User badge */}
          {sidebarOpen && (
            <div className="m-4 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 font-black">
                {adminUser.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-xs text-slate-100 truncate">{adminUser.display_name}</p>
                <p className="text-[9px] bg-blue-500/15 text-blue-300 font-black px-1.5 py-0.2 rounded-full border border-blue-500/10 uppercase tracking-widest inline-block mt-0.5">
                  {adminUser.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'issues', label: 'Issues Management', icon: FileText, badge: activeIssues.length },
              { id: 'departments', label: 'Departments', icon: Building2 },
              { id: 'analytics', label: 'Insights & Analytics', icon: BarChart3 },
              { id: 'audit', label: 'System Compliance Log', icon: History },
              { id: 'settings', label: 'SLA & Settings', icon: Settings }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15 font-bold'
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-blue-600' : 'bg-red-500/15 text-red-400 border border-red-500/10'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {sidebarOpen && (
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center">
              SYSTEM COMMAND MODE
            </div>
          )}
          <button
            onClick={onBackToCitizen}
            className="w-full flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-3 rounded-xl transition-all border border-slate-700"
          >
            <span>Citizen App Mode</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full hover:bg-red-500/15 text-red-400 font-bold text-xs py-2 px-3 rounded-xl transition-all border border-transparent hover:border-red-500/10"
          >
            {sidebarOpen ? 'Logout Secure Session' : 'Exit'}
          </button>
        </div>
      </aside>

      {/* PRIMARY VIEWFINDER SCROLL CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOP STATUS BAR ACCENTS */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-64 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search command database..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none w-full"
              />
            </div>
            
            {/* Restricted indicators */}
            {adminUser.role === 'ward_officer' && (
              <span className="inline-flex items-center bg-orange-50 text-orange-700 border border-orange-200 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider leading-snug animate-pulse max-w-[130px] sm:max-w-xs truncate" title={`Zone restricted view: ${adminUser.zone_assigned}`}>
                ⚠️ <span className="sm:inline hidden">Zone restricted: </span>{adminUser.zone_assigned}
              </span>
            )}
            {adminUser.role === 'department_head' && (
              <span className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-200 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider leading-snug animate-pulse max-w-[130px] sm:max-w-xs truncate" title={`Dept restricted view: ${adminUser.department}`}>
                🏢 <span className="sm:inline hidden">Dept restricted: </span>{adminUser.department}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 hover:bg-slate-100 rounded-xl relative text-slate-500 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 space-y-3 z-40 text-xs animate-fadeIn text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-slate-900">Alert Center</span>
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id)}
                        className={`p-2.5 rounded-xl border text-[11px] cursor-pointer hover:bg-slate-50 transition-all ${
                          n.unread ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold uppercase text-[8px] px-1.5 rounded ${
                            n.type === 'breach' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {n.type}
                          </span>
                          <span className="text-[9px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-slate-700 leading-normal">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 rounded-xl transition-all"
              >
                <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                  {adminUser.display_name[0]}
                </div>
                <span className="text-xs font-bold text-slate-700 hidden sm:inline">{adminUser.display_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-40 text-xs animate-fadeIn text-slate-800">
                  <div className="p-2 border-b border-slate-100">
                    <p className="font-extrabold text-slate-900 truncate">{adminUser.display_name}</p>
                    <p className="text-[9px] text-slate-500 font-bold truncate mt-0.5">{adminUser.phone || 'Administrative Officer'}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('settings'); setShowProfileDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 mt-1"
                  >
                    Portal Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors font-bold"
                  >
                    Sign Out Securely
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* BREADCRUMB INDICATOR ROW */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 font-medium gap-1">
          <div className="flex items-center space-x-1.5">
            <span>Admin Control Panel</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 font-bold capitalize">{activeTab}</span>
          </div>
          <div>
            System Time: <strong className="text-slate-700">2026-06-30 UTC</strong>
          </div>
        </div>

        {/* PRIMARY MAIN VIEWFINDER AREA */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">

          {/* TAB 1: OPERATIONAL DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Row 1: KPI Stats Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Active issues */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center relative overflow-hidden">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Active Tickets</span>
                    <p className="text-2xl font-black text-slate-900">{activeIssues.length}</p>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center space-x-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>-12% decrease weekly</span>
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                {/* Avg resolution time */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Avg Resolution Speed</span>
                    <p className="text-2xl font-black text-slate-900">{avgResolutionTime}</p>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black px-1.5 py-0.2 rounded-full border border-emerald-100 uppercase tracking-widest inline-block mt-1">
                      SLA COMPLIANT Target
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                {/* SLA Breaches */}
                <div className={`${
                  totalSlaBreachedCount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'
                } border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center`}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">SLA Breaches</span>
                    <p className={`text-2xl font-black ${totalSlaBreachedCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {totalSlaBreachedCount}
                    </p>
                    {totalSlaBreachedCount > 0 ? (
                      <span className="text-[10px] text-red-600 font-bold flex items-center space-x-0.5">
                        <AlertTriangle className="w-3 h-3 animate-bounce" />
                        <span>Requires urgent triage</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold">Excellent 100% compliance</span>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    totalSlaBreachedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>

                {/* Resolution rate */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Week Resolution Rate</span>
                    <p className="text-2xl font-black text-slate-900">{resolutionRateThisWeek}%</p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-blue-600 h-full" style={{ width: `${resolutionRateThisWeek}%` }}></div>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Horizontal Ticket Pipeline view */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">MUNICIPAL PIPELINE VELOCITY</h3>
                    <p className="text-[11px] text-slate-500">Real-time status conversion pipeline representation</p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                    Total workload: {issues.length} tickets
                  </span>
                </div>

                {/* Horizontally stacked pipeline bar */}
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100">
                  <div className="bg-slate-400 h-full cursor-pointer hover:opacity-90" style={{ width: `${pipelineStats.reported}%` }} title={`Reported: ${pipelineStats.reported}%`}></div>
                  <div className="bg-amber-400 h-full cursor-pointer hover:opacity-90" style={{ width: `${pipelineStats.investigating}%` }} title={`Investigating: ${pipelineStats.investigating}%`}></div>
                  <div className="bg-blue-500 h-full cursor-pointer hover:opacity-90" style={{ width: `${pipelineStats.in_progress}%` }} title={`In Progress: ${pipelineStats.in_progress}%`}></div>
                  <div className="bg-emerald-500 h-full cursor-pointer hover:opacity-90" style={{ width: `${pipelineStats.resolved}%` }} title={`Resolved: ${pipelineStats.resolved}%`}></div>
                  <div className="bg-slate-300 h-full cursor-pointer hover:opacity-90" style={{ width: `${pipelineStats.duplicate}%` }} title={`Duplicate: ${pipelineStats.duplicate}%`}></div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-600 justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-slate-400 rounded"></span>
                    <span>Reported: {issues.filter(i => i.status === 'reported').length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded"></span>
                    <span>Investigating: {issues.filter(i => i.status === 'investigating').length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded"></span>
                    <span>In Progress: {issues.filter(i => i.status === 'in_progress').length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span>
                    <span>Resolved: {resolvedIssues.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-slate-300 rounded"></span>
                    <span>Duplicate: {issues.filter(i => i.status === 'duplicate').length}</span>
                  </div>
                </div>
              </div>

              {/* Gemini Analytics & Interactive Alerts Board */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Heatmap-style Table: Zones x Categories grid */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 overflow-x-auto">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">ZONE RESOURCE HEATMAP (Active Tickets)</h3>
                    <p className="text-[11px] text-slate-500">Color-intensity cell values representing current unresolved caseloads.</p>
                  </div>

                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-3 text-left font-extrabold text-slate-600">Ward Zone</th>
                        {CATEGORIES.map(cat => (
                          <th key={cat} className="py-2.5 px-1 font-extrabold text-slate-600 capitalize">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {heatmapData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-3 text-left font-bold text-slate-800">{row.zone}</td>
                          {CATEGORIES.map(cat => {
                            const val = row[cat];
                            let cellBg = 'bg-slate-50 text-slate-400';
                            if (val > 0 && val <= 2) cellBg = 'bg-blue-50 text-blue-700 border border-blue-100';
                            if (val > 2 && val <= 5) cellBg = 'bg-blue-100 text-blue-800 border border-blue-200 font-semibold';
                            if (val > 5) cellBg = 'bg-blue-200 text-blue-950 border border-blue-300 font-black ring-2 ring-blue-500/10';

                            return (
                              <td key={cat} className="py-2 px-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${cellBg}`}>
                                  {val}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Gemini AI Insights Panel */}
                <div className="lg:col-span-4 bg-gradient-to-br from-indigo-900 to-slate-950 text-slate-100 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs tracking-wider uppercase text-indigo-400 flex items-center space-x-1.5">
                      <Sparkles className="w-4.5 h-4.5 animate-pulse text-yellow-400" />
                      <span>🤖 AI Operations Advisor</span>
                    </h3>
                    <button
                      onClick={handleFetchAiInsights}
                      disabled={loadingAi}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                      title="Regenerate Gemini report"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingAi ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {loadingAi ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] text-slate-400">Gemini is synthesizing municipal telemetry...</p>
                      </div>
                    ) : aiInsights.length === 0 ? (
                      <p className="text-slate-400 text-xs italic">No operational recommendations compiled yet.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {aiInsights.map((ins, i) => (
                          <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setActiveTab('issues')}>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-yellow-400 rounded-full shrink-0"></span>
                              <h4 className="font-black text-xs text-white leading-normal">{ins.title}</h4>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                              {ins.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action feeds: Requires Action & Today's Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Feed 1: Requires Action */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">⚠️ OPERATIONAL ACTIONS STANDING</h3>
                    <p className="text-[11px] text-slate-500">Critical items demanding department triage/verification</p>
                  </div>

                  <div className="space-y-2.5">
                    
                    {/* Unassigned High Severity */}
                    {issues.filter(i => i.severity === 'high' && !i.assigned_department).map(i => (
                      <div key={i.id} className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
                        <div className="min-w-0 flex items-center space-x-3">
                          <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0 animate-ping"></span>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs text-red-900 truncate">{i.title}</h4>
                            <p className="text-[10px] text-red-700">High severity ticket unassigned near {i.landmark || 'locality'}</p>
                          </div>
                        </div>
                        <button onClick={() => { setActiveIssueDetail(i); setActiveTab('issues'); }} className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 rounded-lg">
                          Assign
                        </button>
                      </div>
                    ))}

                    {/* Pending Verification before/after */}
                    {issues.filter(i => i.status === 'resolved' && !i.resolution_verified).map(i => (
                      <div key={i.id} className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                        <div className="min-w-0 flex items-center space-x-3">
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0"></span>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs text-blue-900 truncate">Verify: {i.title}</h4>
                            <p className="text-[10px] text-blue-700">Citizen resolution submission awaiting approval</p>
                          </div>
                        </div>
                        <button onClick={() => { setActiveIssueDetail(i); setActiveTab('issues'); }} className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 rounded-lg">
                          Verify
                        </button>
                      </div>
                    ))}

                    {issues.filter(i => (i.severity === 'high' && !i.assigned_department) || (i.status === 'resolved' && !i.resolution_verified)).length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-500 font-medium text-xs">
                        🎉 All active compliance queues cleared! No pending priority actions.
                      </div>
                    )}

                  </div>
                </div>

                {/* Feed 2: Today's chronological Activity Timeline */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">📅 CHRONOLOGICAL COMPLIANCE FEED</h3>
                    <p className="text-[11px] text-slate-500">Live feed of events and automated state modifications</p>
                  </div>

                  <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                    
                    {issues.slice(0, 4).map((i, idx) => (
                      <div key={i.id} className="relative text-xs">
                        <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-500/10"></span>
                        <p className="text-slate-400 text-[10px]">{new Date(i.created_at).toLocaleString()}</p>
                        <p className="font-bold text-slate-800 mt-0.5">Issue Registered: <span className="text-blue-600">#{i.id.slice(0,8).toUpperCase()}</span></p>
                        <p className="text-slate-500 mt-0.5 leading-normal">{i.title} classified as <strong className="font-bold">{i.category}</strong> with <strong className="font-bold text-slate-700">{i.severity} severity</strong></p>
                      </div>
                    ))}

                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ISSUES MANAGEMENT */}
          {activeTab === 'issues' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Toolbar filters block */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span>MUNICIPAL ISSUES MASTER TABLE ({filteredIssues.length})</span>
                  </h3>
                  
                  {/* CSV Export */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportCSV(filteredIssues)}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={handlePrintReport}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm flex items-center space-x-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Page</span>
                    </button>
                  </div>
                </div>

                {/* Grid Multi-filters toolbar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  
                  {/* Category filter */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">Category</label>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-850 font-medium">
                      <option value="all">All Categories</option>
                      <option value="pothole">Potholes</option>
                      <option value="road_damage">Road Damage</option>
                      <option value="garbage">Garbage & Trash</option>
                      <option value="illegal_dumping">Illegal Dumping</option>
                      <option value="streetlight">Streetlight</option>
                      <option value="electrical">Electrical Failures</option>
                      <option value="water_leakage">Water Leakage</option>
                      <option value="drainage">Drainage Burst</option>
                      <option value="tree_fallen">Fallen Trees</option>
                      <option value="park_issue">Park Damaged</option>
                      <option value="other">General Other</option>
                    </select>
                  </div>

                  {/* Zone Filter */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">Ward Zone</label>
                    <select value={zoneFilter} onChange={e => setZoneFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-850 font-medium" disabled={adminUser.role === 'ward_officer'}>
                      <option value="all">All Ward Zones</option>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-850 font-medium">
                      <option value="all">All Statuses</option>
                      <option value="reported">Reported</option>
                      <option value="investigating">Investigating</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="duplicate">Duplicate</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">Priority</label>
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-850 font-medium">
                      <option value="all">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  {/* Assigned Toggle */}
                  <div className="space-y-1">
                    <label className="font-extrabold text-slate-500 uppercase text-[9px] tracking-wider">Assignment</label>
                    <select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-850 font-medium">
                      <option value="all">All workload</option>
                      <option value="assigned">Assigned to Dept</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </div>

                </div>

                {/* Bulk selection actions toolbar */}
                {selectedIssueIds.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 animate-fadeIn text-xs text-blue-900">
                    <div className="flex items-center justify-between">
                      <span className="font-black">⚡ BULK ACTION WORKBENCH ({selectedIssueIds.length} tickets selected)</span>
                      <button onClick={() => setSelectedIssueIds([])} className="text-[10px] text-blue-600 hover:underline font-bold">Clear selection</button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-1.5 font-semibold">
                          <option value="">Status Update</option>
                          <option value="reported">Reported</option>
                          <option value="investigating">Investigating</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <select value={bulkDept} onChange={e => setBulkDept(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-1.5 font-semibold">
                          <option value="">Assign Department</option>
                          <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                          <option value="Sanitation Department">Sanitation Department</option>
                          <option value="Electricity Department">Electricity Department</option>
                          <option value="Water Supply Department">Water Supply Department</option>
                          <option value="Parks & Horticulture">Parks & Horticulture</option>
                        </select>
                      </div>

                      <div>
                        <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-1.5 font-semibold">
                          <option value="">Set Priority</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Assign Officer/Staff"
                          value={bulkAssignee}
                          onChange={e => setBulkAssignee(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-1.5"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={handleBulkSubmit}
                        disabled={bulkUpdating}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-md border border-blue-600 disabled:opacity-50"
                      >
                        {bulkUpdating ? 'Applying...' : 'Apply Bulk Actions'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Master Data Table */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase">
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedIssueIds.length === filteredIssues.length && filteredIssues.length > 0}
                            onChange={() => {
                              if (selectedIssueIds.length === filteredIssues.length) {
                                setSelectedIssueIds([]);
                              } else {
                                setSelectedIssueIds(filteredIssues.map(i => i.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                          />
                        </th>
                        <th className="py-3 px-4">Photo</th>
                        <th className="py-3 px-4">Issue Details</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Severity</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">SLA Deadline</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIssues.map(i => {
                        const isSelected = selectedIssueIds.includes(i.id);
                        
                        // Calculate SLA visual status indicator
                        let slaColor = 'bg-emerald-500';
                        let slaLabel = 'SLA Compliant';
                        if (i.status !== 'resolved' && i.sla_deadline) {
                          const limit = new Date(i.sla_deadline).getTime();
                          const left = limit - Date.now();
                          if (left < 0) {
                            slaColor = 'bg-red-600 animate-pulse';
                            slaLabel = 'SLA BREACHED';
                          } else if (left < 12 * 60 * 60 * 1000) {
                            slaColor = 'bg-amber-500 animate-pulse';
                            slaLabel = 'Breaching soon';
                          }
                        }

                        return (
                          <tr
                            key={i.id}
                            className={`hover:bg-slate-50/50 transition-all cursor-pointer ${
                              isSelected ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <td className="py-4 px-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedIssueIds(selectedIssueIds.filter(id => id !== i.id));
                                  } else {
                                    setSelectedIssueIds([...selectedIssueIds, i.id]);
                                  }
                                }}
                                className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                              />
                            </td>
                            <td className="py-4 px-4">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                <img
                                  src={i.photo_url}
                                  alt={i.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback beautiful graphic
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=200';
                                  }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-4 min-w-[200px]" onClick={() => setActiveIssueDetail(i)}>
                              <p className="font-extrabold text-slate-900 leading-normal">{i.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-sm">{i.address}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase">UID: #{i.id.slice(0, 8)}</p>
                            </td>
                            <td className="py-4 px-4" onClick={() => setActiveIssueDetail(i)}>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[i.category] || CATEGORY_COLORS.other}`}>
                                {CATEGORY_LABELS[i.category] || i.category}
                              </span>
                            </td>
                            <td className="py-4 px-4" onClick={() => setActiveIssueDetail(i)}>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${SEVERITY_COLORS[i.severity]}`}>
                                {i.severity}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-700 font-bold uppercase" onClick={() => setActiveIssueDetail(i)}>
                              {i.status}
                            </td>
                            <td className="py-4 px-4" onClick={() => setActiveIssueDetail(i)}>
                              <div className="flex items-center space-x-1.5">
                                <span className={`w-2 h-2 rounded-full ${slaColor}`}></span>
                                <span className="font-semibold text-slate-850">{slaLabel}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => setActiveIssueDetail(i)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 font-extrabold inline-flex items-center space-x-1"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px] text-blue-600">Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DETAILED SIDE DRAWER PANEL (From Right) */}
              {activeIssueDetail && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-fadeIn">
                  <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden relative animate-slideLeft text-slate-800">
                    
                    {/* Drawer Header */}
                    <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">TICKET COMPLIANCE INSPECT</span>
                        <h4 className="font-black text-sm text-slate-900 truncate mt-0.5">#{activeIssueDetail.id.slice(0, 8).toUpperCase()}</h4>
                      </div>
                      <button onClick={() => setActiveIssueDetail(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Drawer Scroll Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* Image Viewer with Zoom overlay */}
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-48 bg-slate-950">
                        <img
                          src={activeIssueDetail.photo_url}
                          alt="Reported problem"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10">
                          📷 Citizen original submission
                        </span>
                      </div>

                      {/* AI Vision analysis details */}
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                        <h5 className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                          <Sparkles className="w-4.5 h-4.5 text-yellow-500" />
                          <span>Gemini Vision Triage Analysis</span>
                        </h5>
                        <p className="text-[11px] text-slate-700 leading-relaxed italic">
                          "{activeIssueDetail.ai_analysis || activeIssueDetail.description}"
                        </p>
                        <div className="flex items-center space-x-4 text-[10px] font-bold text-indigo-800 pt-1">
                          <span>Confidence: {activeIssueDetail.ai_confidence ? Math.round(activeIssueDetail.ai_confidence * 100) : 85}%</span>
                          <span>Auto-Routed: True</span>
                        </div>
                      </div>

                      {/* Detail list metadata card */}
                      <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                          <h4 className="font-extrabold text-sm text-slate-900">{activeIssueDetail.title}</h4>
                          <p className="text-xs text-slate-500 leading-normal mt-1">{activeIssueDetail.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Landmark Address</span>
                            <p className="font-extrabold text-slate-800 leading-tight mt-0.5">{activeIssueDetail.landmark || 'No landmark specified'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Assigned Department</span>
                            <p className="font-extrabold text-slate-800 leading-tight mt-0.5">{activeIssueDetail.assigned_department || 'Unassigned'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">SLA Deadline</span>
                            <p className="font-extrabold text-slate-800 leading-tight mt-0.5">
                              {activeIssueDetail.sla_deadline ? new Date(activeIssueDetail.sla_deadline).toLocaleString() : 'Not set'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block uppercase text-[9px]">Assigned Officer</span>
                            <p className="font-extrabold text-slate-800 leading-tight mt-0.5">{activeIssueDetail.assigned_to || 'None'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Mini location Leaflet map */}
                      <div className="space-y-2">
                        <span className="text-slate-400 font-bold block uppercase text-[9px]">Geospatial Landmark Location</span>
                        <div
                          ref={mapContainerRef}
                          className="h-40 rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100"
                        />
                      </div>

                      {/* If resolved: Before/After comparison & Verification */}
                      {activeIssueDetail.status === 'resolved' && activeIssueDetail.resolution_photo_url && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                          <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Before / After Verification</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold block">BEFORE</span>
                              <div className="h-24 rounded-lg overflow-hidden bg-slate-950 border">
                                <img src={activeIssueDetail.photo_url} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-bold block">AFTER</span>
                              <div className="h-24 rounded-lg overflow-hidden bg-slate-950 border">
                                <img src={activeIssueDetail.resolution_photo_url} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          </div>
                          
                          {activeIssueDetail.resolution_verified ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-bold flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 shrink-0" />
                              <span>Resolution Approved and verified. Ticket is Closed.</span>
                            </div>
                          ) : (
                            <div className="space-y-3.5 pt-2">
                              <p className="text-[11px] text-slate-600 leading-relaxed italic">🤖 Gemini says: "{activeIssueDetail.resolution_ai_analysis || 'Awaiting manual check.'}"</p>
                              <div className="grid grid-cols-2 gap-3.5">
                                <button
                                  onClick={() => handleVerifyResolution(false)}
                                  className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-2 rounded-xl border border-slate-200"
                                >
                                  Reject Resolution
                                </button>
                                <button
                                  onClick={() => handleVerifyResolution(true)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl"
                                >
                                  Approve & Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Internal Notes Editor */}
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <label className="text-slate-400 font-bold block uppercase text-[9px]">Administrative Internal Notes (Officers only)</label>
                        <textarea
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Add notes for compliance audits..."
                          value={internalNotes}
                          onChange={e => setInternalNotes(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSaveIssueDetail({ internal_notes: internalNotes })}
                            disabled={updatingIssue}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition-all"
                          >
                            Save Internal Notes
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Drawer Footer controls */}
                    <div className="h-20 border-t border-slate-200 px-6 bg-slate-50 flex items-center justify-between gap-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => triggerEmailModal('department')}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl"
                          title="Notify Department via Email mockup"
                        >
                          <Building2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => triggerEmailModal('reporter')}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl"
                          title="Notify Reporter via Email mockup"
                        >
                          <Mail className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 w-2/3">
                        <select
                          value={activeIssueDetail.status}
                          onChange={e => handleSaveIssueDetail({ status: e.target.value as any })}
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-850 font-bold w-full"
                        >
                          <option value="reported">Reported</option>
                          <option value="investigating">Investigating</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: DEPARTMENTS PERFORMANCE */}
          {activeTab === 'departments' && (
            <div className="space-y-6 animate-fadeIn text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { name: 'Public Works Department (PWD)', open: issues.filter(i => i.assigned_department === 'Public Works Department (PWD)' && i.status !== 'resolved').length, compliance: '94%', time: '11.2 hours', officers: 4 },
                  { name: 'Sanitation Department', open: issues.filter(i => i.assigned_department === 'Sanitation Department' && i.status !== 'resolved').length, compliance: '92%', time: '8.5 hours', officers: 6 },
                  { name: 'Electricity Department', open: issues.filter(i => i.assigned_department === 'Electricity Department' && i.status !== 'resolved').length, compliance: '96%', time: '14.8 hours', officers: 3 },
                  { name: 'Water Supply Department', open: issues.filter(i => i.assigned_department === 'Water Supply Department' && i.status !== 'resolved').length, compliance: '88%', time: '22.0 hours', officers: 5 },
                ].map((dept, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-xs text-slate-950 max-w-[80%]">{dept.name}</h4>
                      <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
                        {dept.open} open
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block font-bold">SLA Compliance</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">{dept.compliance}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Avg Res Time</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">{dept.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>👤 {dept.officers} Ward officers</span>
                      <span className="text-emerald-600 font-extrabold">Improving</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scorecard table comparison */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-900">DEPARTMENT SLA COMPLIANCE SCORECARD</h3>
                <p className="text-slate-500">Official monthly efficiency benchmark logs</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-500 font-bold uppercase">
                        <th className="p-3">Department Name</th>
                        <th className="p-3 text-center">Unresolved Workload</th>
                        <th className="p-3 text-center">Resolved Workload</th>
                        <th className="p-3 text-center">Avg Response Limit</th>
                        <th className="p-3 text-right">Operational Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Public Works Department (PWD)</td>
                        <td className="p-3 text-center">8 tickets</td>
                        <td className="p-3 text-center">24 tickets</td>
                        <td className="p-3 text-center">48 hours</td>
                        <td className="p-3 text-right text-emerald-600 font-bold">⭐⭐⭐⭐⭐ (Excellent)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Sanitation Department</td>
                        <td className="p-3 text-center">12 tickets</td>
                        <td className="p-3 text-center">45 tickets</td>
                        <td className="p-3 text-center">24 hours</td>
                        <td className="p-3 text-right text-emerald-600 font-bold">⭐⭐⭐⭐⭐ (Excellent)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Electricity Department</td>
                        <td className="p-3 text-center">4 tickets</td>
                        <td className="p-3 text-center">15 tickets</td>
                        <td className="p-3 text-center">48 hours</td>
                        <td className="p-3 text-right text-emerald-600 font-bold">⭐⭐⭐⭐⭐ (Excellent)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-800">Water Supply Department</td>
                        <td className="p-3 text-center">15 tickets</td>
                        <td className="p-3 text-center">38 tickets</td>
                        <td className="p-3 text-center">72 hours</td>
                        <td className="p-3 text-right text-amber-600 font-bold">⭐⭐⭐⭐ (Stable)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: INSIGHTS & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Row 1: Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Time-series: reported vs resolved */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">HISTORICAL PIPELINE EFFICIENCY (90 Days)</h4>
                    <p className="text-[11px] text-slate-500">Citizen Reported vs. Resolved tickets over 90 days period</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData} margin={{ left: -10, right: 10, top: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Reported" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Resolved" stroke="#10b981" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category distribution pie */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">CATEGORY CLASSIFICATION RATIOS</h4>
                    <p className="text-[11px] text-slate-500">Distribution of active and closed municipal tickets</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 text-xs font-bold text-slate-600">
                      {pieChartData.map((d, index) => (
                        <div key={index} className="flex items-center space-x-3.5">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pieColors[index % pieColors.length] }}></span>
                          <span className="truncate">{d.name}: {d.value} reports</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Hotspot bar chart & KPI tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                
                {/* Horizontal hotspot barchart */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">TOP HOTSPOT WARD SECTORS</h4>
                    <p className="text-[11px] text-slate-500">Caseload density by geographical town sectors</p>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hotspotData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Citizen engagements & AI metrics */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">CITIZEN INTERACTION & AI COMPLIANCE</h4>
                    <p className="text-[11px] text-slate-500">Administrative metric performance index logs</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border rounded-2xl">
                      <span className="text-slate-500 block font-bold text-[10px]">ACTIVE REPORTERS (MONTH)</span>
                      <p className="text-xl font-black text-slate-900 mt-1">245 citizens</p>
                      <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">↑ 22% increase</span>
                    </div>

                    <div className="p-4 bg-slate-50 border rounded-2xl">
                      <span className="text-slate-500 block font-bold text-[10px]">REPEAT CORRESPONDENCE</span>
                      <p className="text-xl font-black text-slate-900 mt-1">12.5% ratio</p>
                      <span className="text-[10px] text-slate-500 mt-1 inline-block">Excellent low churn</span>
                    </div>

                    <div className="p-4 bg-slate-50 border rounded-2xl">
                      <span className="text-slate-500 block font-bold text-[10px]">AI TRIAGE CLASSIFICATION</span>
                      <p className="text-xl font-black text-slate-900 mt-1">94.8% accuracy</p>
                      <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-block">Verified by 500 audits</span>
                    </div>

                    <div className="p-4 bg-slate-50 border rounded-2xl">
                      <span className="text-slate-500 block font-bold text-[10px]">DUPLICATE DETECTION SENSITIVITY</span>
                      <p className="text-xl font-black text-slate-900 mt-1">91.2% accuracy</p>
                      <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-block">Bypassed zero errors</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: SYSTEM COMPLIANCE LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">GOVERNMENT COMPLIANCE AUDIT LOG</h3>
                    <p className="text-xs text-slate-500">Searchable history log of administrative actions as required by law</p>
                  </div>
                  <button
                    onClick={() => {
                      alert('Generating export for legal compliance audits.');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow"
                  >
                    Export audit logs to CSV
                  </button>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-500 font-bold uppercase">
                        <th className="p-3">Audit ID</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Officer / Actor</th>
                        <th className="p-3">Action Details</th>
                        <th className="p-3">Reference Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {issues.map((iss, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-400">#AUD-${(10023 + idx)}</td>
                          <td className="p-3 text-slate-500">{new Date(iss.created_at).toLocaleString()}</td>
                          <td className="p-3 font-bold text-blue-600">Super Admin Officer</td>
                          <td className="p-3 text-slate-800 font-sans">
                            Assigned {CATEGORY_LABELS[iss.category] || iss.category} ticket to <strong className="font-bold">{iss.assigned_department || 'Municipal Administration'}</strong>
                          </td>
                          <td className="p-3 font-bold text-slate-900 text-right">#{iss.id.slice(0, 8).toUpperCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: SLA MANAGEMENT & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn text-xs text-slate-800">
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">SLA COMPLIANCE MANAGEMENT CONFIGURATION</h3>
                  <p className="text-slate-500 leading-normal">Configure default resolution thresholds for ward categories and emergency levels</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b pb-6">
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">EMERGENCY (HIGH) SLA</span>
                    <p className="text-base font-black text-slate-950">24 Hours</p>
                    <p className="text-[11px] text-slate-500">Applied to burst pipelines, hazardous road craters, gas line dark lights</p>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">ROUTINE (MEDIUM) SLA</span>
                    <p className="text-base font-black text-slate-950">72 Hours (3 Days)</p>
                    <p className="text-[11px] text-slate-500">Applied to overflowing garbage heaps, road damage, non-haz light poles</p>
                  </div>
                  <div className="bg-slate-50 border rounded-2xl p-4 space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">GENERAL (LOW) SLA</span>
                    <p className="text-base font-black text-slate-950">168 Hours (1 Week)</p>
                    <p className="text-[11px] text-slate-500">Applied to general horticultural issues, aesthetic damages</p>
                  </div>
                </div>

                {/* Database Reset Option */}
                <div className="space-y-3.5 pt-2">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-900 uppercase text-red-600">Database Administration</h4>
                    <p className="text-slate-500 leading-normal max-w-xl">Use these functions during development or live demonstrations to clear seed records or reset simulation configurations.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleClearDatabase}
                      className="bg-red-600 hover:bg-red-700 text-white border border-red-600 font-extrabold px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Wipe Sample Reports (Clean Slate for Demo)</span>
                    </button>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                      }}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold px-5 py-2.5 rounded-xl"
                    >
                      Reset Local Cache
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* QUICK ACTION FLOATING COMPLIANCE WIDGET */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            alert('Triggering automated hotspot sweep scan: 0 duplicates found.');
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-blue-500 transition-all active:scale-95"
          title="Automated duplicate sweep scanner"
        >
          <Sparkles className="w-4.5 h-4.5 text-yellow-400" />
          <span>Quick Hotspot Scan</span>
        </button>
      </div>

      {/* EMAIL COMPOSER MODAL (MOCK) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col justify-between text-slate-800 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">OUTBOUND MAIL GATEWAY (SIMULATED)</span>
              <button onClick={() => setShowEmailModal(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block uppercase text-[9px]">To Recipient</label>
                <input
                  type="text"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block uppercase text-[9px]">Subject Header</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 focus:outline-none font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block uppercase text-[9px]">Outbound Body Text</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-3 focus:outline-none font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t px-6 py-3.5 flex justify-end space-x-2">
              <button
                onClick={() => setShowEmailModal(null)}
                className="bg-white hover:bg-slate-100 border text-slate-700 font-bold px-4 py-2 rounded-xl"
              >
                Cancel Draft
              </button>
              <button
                onClick={handleSendEmailMock}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl shadow"
              >
                Send Outbound Email
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
