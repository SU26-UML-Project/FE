import React from 'react';
import {
  BarChart3, Settings, Shield, LifeBuoy, Bot, SlidersHorizontal,
  FileText, Users, ShieldCheck, Activity, UserPlus, ChevronLeft,
  ChevronRight, Loader2, X, Search, Bell, HelpCircle, TrendingUp,
  TrendingDown, Minus, CheckCircle2, MoreVertical, Mail, Phone,
  Calendar, AlertCircle, Lock, Unlock, Trash2, Home,
  ArrowUpDown, ArrowUp, ArrowDown,
  Image as ImageIcon, Brain, Zap, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import type { AdminUserListItem } from '../types/auth';
import { projectService } from '../services/projectService';
import type { ProjectResponse } from '../types/project';
import AdminHeader from '../components/admin/AdminHeader';
import LlmProviderTab from '../components/admin/LlmProviderTab';
import WorkspaceConfigTab from '../components/admin/WorkspaceConfigTab';
import DocumentsTab from '../components/admin/DocumentsTab';
import type { AdminTab, NavItemConfig, NavSection } from '../types/admin';
import {
  MOCK_ACTIVITY_CHART_DATA,
  MOCK_KPIS,
  MOCK_ACTIVITY_LOGS,
} from '../mocks/admin';

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    label: 'Managements',
    items: [
      { id: 'user-management', label: 'User Management', icon: <Users size={18} /> },
      { id: 'role-permissions', label: 'Role & Permissions', icon: <ShieldCheck size={18} /> },
      { id: 'user-activity', label: 'User Activity', icon: <Activity size={18} /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'ai-model-config', label: 'AI / Model Config', icon: <Bot size={18} /> },
      { id: 'workspace-config', label: 'Workspace Config', icon: <SlidersHorizontal size={18} /> },
      { id: 'document-manager',label: 'Document Manager', icon: <FileText size={18} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'system-settings', label: 'System Settings', icon: <Settings size={18} /> },
      { id: 'audit-logs', label: 'Audit Logs', icon: <Shield size={18} /> },
      { id: 'support-tickets', label: 'Support Tickets', icon: <LifeBuoy size={18} /> },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-red-100 text-red-600',
  PENDING_DELETE: 'bg-amber-100 text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  LOCKED: 'Locked',
  PENDING_DELETE: 'Pending Delete',
};

const getRoleName = (role: AdminUserListItem['role']) =>
  typeof role === 'string' ? role : role?.roleName ?? '—';

const getInitials = (name?: string, email?: string) => {
  const src = name || email || '?';
  return src
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="bg-admin-bg text-admin-on-surface font-priego h-screen flex flex-col overflow-hidden">
      <div className="absolute inset-0 grid-background opacity-30 pointer-events-none" />

      <AdminHeader />

      <div className="flex flex-1 overflow-hidden">
      {/* ── Sidebar ── */}
      <nav
        className={`bg-[#f0f4f7] border-r border-admin-outline flex flex-col h-full py-5 shrink-0 z-10 hidden md:flex transition-all duration-300 relative ${
          isSidebarCollapsed ? 'w-[80px]' : 'w-[280px]'
        }`}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-admin-outline rounded-full flex items-center justify-center text-admin-secondary hover:text-uml-blue shadow-sm z-20 transition-transform active:scale-90"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <Link
          to="/"
          title="Back to Landing Page"
          className={`px-6 mb-10 flex items-center gap-3 transition-all duration-300 group cursor-pointer ${
            isSidebarCollapsed ? 'px-4 justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 bg-uml-blue rounded flex items-center justify-center text-white font-bold text-xl shrink-0 group-hover:bg-blue-700 transition-colors">
            SA
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-bold text-lg leading-tight group-hover:text-uml-blue transition-colors">System Admin</h2>
              <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest mt-1">
                Enterprise Tier
              </p>
            </div>
          )}
        </Link>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 [&::-webkit-scrollbar]:w-0">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!isSidebarCollapsed && (
                <p className="text-[10px] font-black text-admin-secondary uppercase tracking-[0.2em] mb-1 px-0">
                  {section.label}
                </p>
              )}
              <div className={`space-y-0.5 ${isSidebarCollapsed ? 'px-2' : ''}`}>
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                    collapsed={isSidebarCollapsed}
                    small
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`px-4 mt-2 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-admin-secondary hover:bg-gray-100 hover:text-black font-bold text-[12px] ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <Home size={18} className="text-gray-400 shrink-0" />
            {!isSidebarCollapsed && <span>Back to Home LandingPage</span>}
          </Link>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
          <div className="max-w-[1200px] mx-auto">
            {(() => {
              const bc = (() => {
                for (const s of NAV_SECTIONS) {
                  const item = s.items.find(i => i.id === activeTab);
                  if (item) return s.label + ' › ' + item.label;
                }
                return null;
              })();
              return bc ? (
                <div className="flex items-center gap-1.5 text-[11px] text-admin-secondary font-bold uppercase tracking-wider mb-8">
                  <span className="text-uml-blue">Admin</span>
                  <span className="text-gray-300 mx-0.5">›</span>
                  {bc.split(' › ').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <span className={i === arr.length - 1 ? 'text-black' : ''}>{part}</span>
                      {i < arr.length - 1 && <span className="text-gray-300 mx-0.5">›</span>}
                    </React.Fragment>
                  ))}
                </div>
              ) : null;
            })()}
            {activeTab === 'dashboard' && <AnalyticsTab />}
            {activeTab === 'user-management' && <UserManagementTab />}
            {activeTab === 'ai-model-config' && <LlmProviderTab />}
            {activeTab === 'workspace-config' && <WorkspaceConfigTab />}
            {activeTab === 'document-manager' && <DocumentsTab />}
            {['system-settings', 'audit-logs', 'support-tickets', 'role-permissions', 'user-activity'].includes(activeTab) && (
              <PlaceholderTab label={NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab)?.label || activeTab} />
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder Tab
// ─────────────────────────────────────────────────────────────────────────────
const PlaceholderTab: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-32 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <Settings size={28} className="text-gray-300" />
    </div>
    <h2 className="text-2xl font-bold text-black mb-2">{label}</h2>
    <p className="text-admin-on-surface-variant max-w-sm">
      This section is under development and will be available in a future update.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Tab
// ─────────────────────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC = () => {
  const [stats, setStats] = React.useState({
    totalProjects: 0,
    totalUsers: 0,
  });
  const [recentProjects, setRecentProjects] = React.useState<ProjectResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, projectsRes] = await Promise.all([
          authService.getAllUsers({ page: 0, size: 1 }),
          projectService.getAllProjectsForAdmin(),
        ]);

        const allProjects = projectsRes.result || [];
        const totalUsers = usersRes.result.totalElements ?? 0;

        setStats(prev => ({
          ...prev,
          totalProjects: allProjects.length,
          totalUsers,
        }));

        setRecentProjects(allProjects.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch analytics data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = MOCK_ACTIVITY_CHART_DATA;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Analytics Overview</h1>
        <p className="text-sm text-gray-500">Monitor application performance and system health</p>
      </div>

      {/* 2. Tier 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Users"
          value={loading ? '...' : stats.totalUsers}
          badge="+100% vs last week"
          badgeColor="green"
          icon={<Users className="text-blue-500" size={20} />}
        />
        <KPICard
          title="Total Diagrams"
          value="1"
          badge="+0%"
          badgeColor="gray"
          icon={<ImageIcon className="text-purple-500" size={20} />}
        />
        <KPICard
          title="AI Requests"
          value="142"
          badge="+12% usage"
          badgeColor="green"
          icon={<Brain className="text-amber-500" size={20} />}
        />
        <KPICard
          title="System Status"
          value="All Systems Operational"
          icon={<BlinkingDot />}
          isStatus
        />
      </div>

      {/* 3. Tier 2: Main Analytics */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[300px]">
        {/* Left Section: Application Activity */}
        <div className="lg:w-[70%] bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Application Activity (Diagrams & Users)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDiagrams" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="diagrams" stroke="#8884d8" fillOpacity={1} fill="url(#colorDiagrams)" />
                <Area type="monotone" dataKey="users" stroke="#82ca9d" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Section: System Telemetry */}
        <div className="lg:w-[30%] flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Server Load (%)</h3>
            <div className="flex items-end justify-between mb-4">
              <span className="text-3xl font-black text-slate-800">{MOCK_KPIS.serverLoad.value}</span>
              <div className="h-8 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(-10)}>
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">API Latency (ms)</h3>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-slate-800">{MOCK_KPIS.apiLatency.value}</span>
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded">{MOCK_KPIS.apiLatency.statusLabel}</span>
              </div>
              <div className="h-8 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.slice(-10)}>
                    <Line type="monotone" dataKey="diagrams" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tier 3: Details & Logs */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Section: Recent Projects */}
        <div className="lg:w-[60%] bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Recent Projects</h3>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Last Modified</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr><td colSpan={3} className="py-10 text-center text-slate-400">Loading projects...</td></tr>
                ) : recentProjects.length > 0 ? (
                  recentProjects.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-700">{p.projectName}</td>
                      <td className="py-4 px-6 text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded tracking-wider">Published</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="py-10 text-center text-slate-400">No projects found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: System Activity Log */}
        <div className="lg:w-[40%] bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">System Activity Log</h3>
          <div className="space-y-6">
            {MOCK_ACTIVITY_LOGS.map((log, idx) => (
              <LogEntry key={idx} time={log.time} text={log.text} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// User Management Tab
// ─────────────────────────────────────────────────────────────────────────────
const UserManagementTab: React.FC = () => {
  const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<AdminUserListItem | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addAdminData, setAddAdminData] = React.useState({
    fullName: '', email: '', password: '', phone: '',
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'ADMIN' | 'USER'>('all');
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [totalElements, setTotalElements] = React.useState(0);
  const PAGE_SIZE = 20;
  const [sort, setSort] = React.useState<{ field: string; dir: 'asc' | 'desc' }>({
    field: 'createdAt',
    dir: 'desc',
  });

  const handleSort = (field: string) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    );
    setPage(0);
  };

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    authService
      .getAllUsers({ page, size: PAGE_SIZE, sort: `${sort.field},${sort.dir}` })
      .then((res) => {
        if (mounted) {
          setUsers(res.result.content);
          setTotalPages(res.result.totalPages);
          setTotalElements(res.result.totalElements);
        }
      })
      .catch((e: any) => { if (mounted) setError(e?.message || 'Failed to load users'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page, sort]);

  const handleViewDetail = async (userId: string) => {
    setSelectedUser(null);
    setDetailLoading(true);
    try {
      const res = await authService.getUserById(userId);
      setSelectedUser(res.result);
    } catch {
      const found = users.find((u) => u.id === userId) ?? null;
      setSelectedUser(found);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await authService.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const newStatus = u.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
            return { ...u, status: newStatus };
          }
          return u;
        })
      );
    } catch (e: any) {
      alert(e?.message || 'An error occurred while changing user status');
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await authService.registerAdmin(addAdminData);
      setUsers((prev) => [res.result as unknown as AdminUserListItem, ...prev]);
      setIsAddModalOpen(false);
      setAddAdminData({ fullName: '', email: '', password: '', phone: '' });
      alert('Admin account created successfully!');
    } catch (e: any) {
      alert(e?.message || 'An error occurred while creating admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (u.fullName || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      getRoleName(u.role).toLowerCase().includes(q) ||
      (u.status || '').toLowerCase().includes(q);

    const roleName = getRoleName(u.role).toUpperCase();
    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'ADMIN' && roleName === 'ADMIN') ||
      (roleFilter === 'USER' && roleName !== 'ADMIN');

    return matchSearch && matchRole;
  });

  return (
    <>
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black">User Management</h1>
          <p className="text-lg text-admin-on-surface-variant mt-2">
            Manage user accounts, roles, and permissions.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-uml-blue text-white font-bold text-[14px] uppercase px-6 py-3 rounded flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      <div className="bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-admin-outline flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-black">All Users</h2>
            {!loading && !error && (
              <span className="text-[11px] font-bold text-admin-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                {filtered.length}
              </span>
            )}
            <div className="flex items-center ml-2 bg-gray-100 rounded p-0.5 border border-admin-outline">
              {(['all', 'ADMIN', 'USER'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider transition-all ${
                    roleFilter === r
                      ? 'bg-white text-uml-blue shadow-sm border border-admin-outline'
                      : 'text-admin-secondary hover:text-black'
                  }`}
                >
                  {r === 'all' ? 'All' : r === 'ADMIN' ? 'Admin' : 'User'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center bg-white rounded border border-admin-outline px-3 py-1.5 w-full md:w-[300px] focus-within:border-uml-blue transition-all">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              className="bg-transparent border-none outline-none w-full text-sm placeholder:text-gray-400 p-0"
              placeholder="Filter by name, email, role, status..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && (
            <div className="flex items-center justify-center py-20 gap-3 text-admin-secondary">
              <Loader2 size={22} className="animate-spin text-uml-blue" />
              <span className="text-sm font-bold">Loading users&hellip;</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
              <AlertCircle size={28} />
              <p className="text-sm font-bold">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold text-uml-blue hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-admin-secondary">
              <Users size={28} className="opacity-40" />
              <p className="text-sm font-bold">No users found</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Email</th>
                  <SortableTh label="Role" field="role.roleName" sort={sort} onSort={handleSort} />
                  <th className="py-4 px-6">Status</th>
                  <SortableTh label="Joined" field="createdAt" sort={sort} onSort={handleSort} />
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    id={user.id}
                    name={user.fullName || user.email.split('@')[0]}
                    email={user.email}
                    role={getRoleName(user.role)}
                    status={STATUS_LABEL[user.status || ''] || user.status || 'Active'}
                    joinedAt={formatDate(user.createdAt)}
                    avatarUrl={user.avatarUrl}
                    onViewDetail={handleViewDetail}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-admin-outline flex items-center justify-between bg-gray-50/30">
            <p className="text-[12px] text-admin-secondary font-bold">
              Page <span className="text-black">{page + 1}</span> of{' '}
              <span className="text-black">{totalPages}</span>
              <span className="ml-2 text-gray-400">({totalElements} users)</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold border border-admin-outline rounded hover:border-uml-blue hover:text-uml-blue transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-bold border border-admin-outline rounded hover:border-uml-blue hover:text-uml-blue transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-[450px] bg-white rounded-2xl shadow-2xl p-7 font-priego"
            >
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-black transition"
              >
                <X size={20} />
              </button>
              <div className="mb-6">
                <h3 className="text-2xl font-black text-black">Create Admin</h3>
                <p className="text-sm text-gray-500">Add a new administrator to the system.</p>
              </div>
              <form onSubmit={handleRegisterAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input required type="text" value={addAdminData.fullName} onChange={(e) => setAddAdminData({ ...addAdminData, fullName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm" placeholder="Enter full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input required type="email" value={addAdminData.email} onChange={(e) => setAddAdminData({ ...addAdminData, email: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm" placeholder="admin@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                  <input required type="password" value={addAdminData.password} onChange={(e) => setAddAdminData({ ...addAdminData, password: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm" placeholder="Min 6 characters" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone (Optional)</label>
                  <input type="text" value={addAdminData.phone} onChange={(e) => setAddAdminData({ ...addAdminData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-admin-outline rounded-lg focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue outline-none transition-all text-sm" placeholder="090..." />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 border border-admin-outline text-admin-secondary font-bold text-sm rounded-lg hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-uml-blue text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    Create Admin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Detail Modal */}
      <AnimatePresence>
        {(detailLoading || selectedUser) && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedUser(null); setDetailLoading(false); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl p-7 font-priego"
            >
              <button
                onClick={() => { setSelectedUser(null); setDetailLoading(false); }}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-black transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={28} className="animate-spin text-uml-blue" />
                </div>
              ) : selectedUser ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-uml-blue/10 text-uml-blue flex items-center justify-center text-2xl font-black overflow-hidden shrink-0">
                      {selectedUser.avatarUrl ? <img src={selectedUser.avatarUrl} alt={selectedUser.fullName} className="w-full h-full object-cover" /> : getInitials(selectedUser.fullName, selectedUser.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-black truncate">{selectedUser.fullName || selectedUser.email.split('@')[0]}</h3>
                      <p className="text-sm text-gray-500 truncate">{selectedUser.email}</p>
                      <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[selectedUser.status || ''] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[selectedUser.status || ''] || selectedUser.status || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0 border-t border-gray-100 pt-5">
                    <DetailRow label="Role" value={getRoleName(selectedUser.role)} />
                    <DetailRow label="Phone" value={selectedUser.phone || '—'} icon={<Phone size={13} className="text-gray-400" />} />
                    <DetailRow label="Date of Birth" value={formatDate(selectedUser.dob)} icon={<Calendar size={13} className="text-gray-400" />} />
                    <DetailRow label="Joined" value={formatDate(selectedUser.createdAt)} />
                    <DetailRow label="Profile Completed" value={selectedUser.profileCompleted ? 'Yes' : 'No'} />
                    <DetailRow label="User ID" value={selectedUser.id} mono />
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI components
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-4">
    <span className="text-xs text-gray-500 font-semibold shrink-0">{label}</span>
    <span className={`text-xs font-bold text-black text-right break-all flex items-center gap-1 ${mono ? 'font-mono text-[10px] text-gray-500' : ''}`}>
      {icon}{value}
    </span>
  </div>
);

const NavItem = ({ icon, label, active = false, small = false, onClick, collapsed = false }: { icon: React.ReactNode; label: string; active?: boolean; small?: boolean; onClick?: () => void; collapsed?: boolean }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
      active
        ? 'bg-blue-100/50 text-uml-blue border-r-4 border-uml-blue font-bold'
        : 'text-admin-secondary hover:bg-gray-100 hover:text-black font-bold'
    } ${small ? 'py-2 text-[12px]' : 'text-[13px] uppercase tracking-wider'} ${collapsed ? 'justify-center px-0' : ''}`}
  >
    <span className={`${active ? 'text-uml-blue' : 'text-gray-400 group-hover:text-black'} transition-colors shrink-0`}>
      {icon}
    </span>
    {!collapsed && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
  </button>
);

const KPICard = ({ title, value, badge, badgeColor, icon, isStatus }: {
  title: string;
  value: string | number;
  badge?: string;
  badgeColor?: 'green' | 'gray';
  icon: React.ReactNode;
  isStatus?: boolean;
}) => (
  <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">
        {icon}
      </div>
      {badge && (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          badgeColor === 'green' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {badge}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className={`font-bold text-slate-800 ${isStatus ? 'text-sm' : 'text-2xl'}`}>{value}</p>
    </div>
  </div>
);

const BlinkingDot = () => (
  <div className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
  </div>
);

const LogEntry = ({ time, text }: { time: string; text: string }) => (
  <div className="flex gap-4 relative pb-6 last:pb-0">
    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-100 last:hidden" />
    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
    </div>
    <div className="flex-1 pt-0.5">
      <p className="text-xs font-bold text-slate-400 mb-1">{time}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
    </div>
  </div>
);

const SortableTh = ({
  label, field, sort, onSort,
}: {
  label: string;
  field: string;
  sort: { field: string; dir: 'asc' | 'desc' };
  onSort: (field: string) => void;
}) => {
  const isActive = sort.field === field;
  const Icon = isActive ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      onClick={() => onSort(field)}
      className="py-4 px-6 cursor-pointer select-none group"
    >
      <span className="flex items-center gap-1.5">
        {label}
        <Icon
          size={13}
          className={isActive ? 'text-uml-blue' : 'text-gray-300 group-hover:text-gray-500 transition-colors'}
        />
      </span>
    </th>
  );
};

const UserRow = ({ id, name, email, role, status, joinedAt, avatarUrl, onViewDetail, onToggleStatus }: {
  id: string; name: string; email: string; role: string; status: string; joinedAt: string; avatarUrl?: string;
  onViewDetail: (id: string) => void; onToggleStatus: (id: string) => void;
}) => {
  const [isToggling, setIsToggling] = React.useState(false);
  const statusColors: Record<string, string> = { Active: 'bg-emerald-100 text-emerald-600', Inactive: 'bg-gray-100 text-gray-500', Pending: 'bg-amber-100 text-amber-600', Locked: 'bg-red-100 text-red-600', 'Pending Delete': 'bg-amber-100 text-amber-600' };
  const isLocked = status === 'Locked';
  const handleToggle = async (e: React.MouseEvent) => { e.stopPropagation(); if (isToggling) return; setIsToggling(true); try { await onToggleStatus(id); } finally { setIsToggling(false); } };
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <tr onClick={() => onViewDetail(id)} className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group cursor-pointer">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-uml-blue flex items-center justify-center font-bold text-xs overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
          <span className="font-bold text-black">{name}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{email}</td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-1.5 text-admin-on-surface-variant">
          {role === 'Admin' || role === 'ADMIN' ? <ShieldCheck size={14} className="text-uml-blue" /> : <Users size={14} />}
          {role}
        </div>
      </td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${statusColors[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
      </td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{joinedAt}</td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end gap-2">
          <button title={isLocked ? 'Unlock User' : 'Lock User'} onClick={handleToggle} disabled={isToggling} className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${isLocked ? 'text-emerald-500' : 'text-admin-error'} ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isToggling ? <Loader2 size={16} className="animate-spin" /> : isLocked ? <Unlock size={16} /> : <Lock size={16} />}
          </button>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default AdminDashboard;
