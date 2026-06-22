import React from 'react';
import {
  BarChart3, Settings, Shield, LifeBuoy, Bot, SlidersHorizontal,
  FileText, Users, ShieldCheck, Activity, UserPlus, ChevronLeft,
  ChevronRight, Loader2, X, Search, Bell, HelpCircle, TrendingUp,
  TrendingDown, Minus, CheckCircle2, MoreVertical, Mail, Phone,
  Calendar, AlertCircle, Lock, Unlock, Trash2, Home,
} from 'lucide-react';
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

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
      { id: 'system-settings', label: 'System Settings', icon: <Settings size={18} /> },
      { id: 'audit-logs', label: 'Audit Logs', icon: <Shield size={18} /> },
      { id: 'support-tickets', label: 'Support Tickets', icon: <LifeBuoy size={18} /> },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'ai-model-config', label: 'AI / Model Config', icon: <Bot size={18} /> },
      { id: 'workspace-config', label: 'Workspace Config', icon: <SlidersHorizontal size={18} /> },
      { id: 'document-manager', label: 'Document Manager', icon: <FileText size={18} /> },
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

        <div
          className={`px-6 mb-10 flex items-center gap-3 transition-all duration-300 ${
            isSidebarCollapsed ? 'px-4 justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 bg-uml-blue rounded flex items-center justify-center text-white font-bold text-xl shrink-0">
            SA
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-bold text-lg leading-tight">System Admin</h2>
              <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest mt-1">
                Enterprise Tier
              </p>
            </div>
          )}
        </div>

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
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
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
    activeSubscribers: 0,
    storageUsed: 0,
  });
  const [recentProjects, setRecentProjects] = React.useState<ProjectResponse[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, projectsRes] = await Promise.all([
          authService.getAllUsers(),
          projectService.getAllProjectsForAdmin(),
        ]);

        const allUsers = usersRes.result || [];
        const allProjects = projectsRes.result || [];

        setStats({
          totalProjects: allProjects.length,
          totalUsers: allUsers.length,
          activeSubscribers: allUsers.filter((u: AdminUserListItem) => u.status === 'ACTIVE').length,
          storageUsed: Math.round(allProjects.length * 0.15 * 10) / 10,
        });

        setRecentProjects(allProjects.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch analytics data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight text-black">Analytics Overview</h1>
        <p className="text-lg text-admin-on-surface-variant mt-2">
          Monitor system health and project metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Diagrams" value={loading ? '...' : stats.totalProjects.toLocaleString()} trend="+100%" />
        <StatCard title="Active Users" value={loading ? '...' : stats.totalUsers.toLocaleString()} trend="+100%" />
        <StatCard title="Storage Used (MB)" value={loading ? '...' : stats.storageUsed.toString()} trend="+0%" neutral />
        <StatCard title="Active Subscriptions" value={loading ? '...' : stats.activeSubscribers.toLocaleString()} trend="+100%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-admin-outline flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-black">Recent Projects</h2>
            <button className="text-[12px] font-bold text-uml-blue hover:underline uppercase tracking-wider">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-uml-blue" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                    <th className="py-4 px-6">Project Name</th>
                    <th className="py-4 px-6">Last Modified</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentProjects.length > 0 ? (
                    recentProjects.map((p: any) => (
                      <ProjectRow key={p.id} name={p.projectName} time={new Date(p.updatedAt).toLocaleDateString()} status="Published" />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-gray-400 font-bold">
                        No projects found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden relative">
          <div className="p-6 border-b border-admin-outline flex justify-between items-center bg-white z-10">
            <h2 className="text-xl font-bold text-black">System Health</h2>
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          </div>
          <div className="p-6 flex-1 flex flex-col z-10 bg-white/90 backdrop-blur-sm">
            <HealthBar label="Server Load" value={12} />
            <HealthBar label="API Latency" value={15} valueLabel="45ms" color="emerald" />
            <div className="mt-auto pt-4 border-t border-admin-outline">
              <p className="text-[11px] text-admin-secondary font-bold uppercase flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                All systems operational. Last checked 1 min ago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
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

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    authService
      .getAllUsers()
      .then((res) => { if (mounted) setUsers(res.result); })
      .catch((e: any) => { if (mounted) setError(e?.message || 'Failed to load users'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

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
    return (
      !q ||
      (u.fullName || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      getRoleName(u.role).toLowerCase().includes(q) ||
      (u.status || '').toLowerCase().includes(q)
    );
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
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Last Login</th>
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
                    lastLogin="—"
                    avatarUrl={user.avatarUrl}
                    onViewDetail={handleViewDetail}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
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

const StatCard = ({ title, value, trend, negative = false, neutral = false }: { title: string; value: string; trend: string; negative?: boolean; neutral?: boolean }) => (
  <div className="bg-white border border-admin-outline p-6 flex flex-col justify-between h-[140px] hover:border-uml-blue/50 transition-colors">
    <h3 className="text-[11px] font-bold text-admin-secondary uppercase tracking-widest">{title}</h3>
    <div className="flex items-end justify-between">
      <span className="text-3xl font-black text-black">{value}</span>
      <div className={`flex items-center text-[13px] font-bold ${negative ? 'text-admin-error' : neutral ? 'text-admin-secondary' : 'text-uml-blue'}`}>
        {neutral ? <Minus size={14} className="mr-1" /> : trend.startsWith('+') ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
        {trend}
      </div>
    </div>
  </div>
);

const ProjectRow = ({ name, time, status }: { name: string; time: string; status: string }) => {
  const statusColors: Record<string, string> = { Published: 'bg-blue-100 text-uml-blue', Draft: 'bg-gray-100 text-gray-600', Archived: 'bg-gray-200 text-gray-500' };
  return (
    <tr className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group">
      <td className="py-4 px-6 font-bold text-black">{name}</td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{time}</td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${statusColors[status]}`}>{status}</span>
      </td>
    </tr>
  );
};

const HealthBar = ({ label, value, valueLabel, color = 'blue' }: { label: string; value: number; valueLabel?: string; color?: 'blue' | 'emerald' }) => (
  <div className="mb-6">
    <div className="flex justify-between items-end mb-2">
      <span className="text-[11px] font-bold text-admin-secondary uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-black">{valueLabel || `${value}%`}</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-1000 ${color === 'blue' ? 'bg-uml-blue' : 'bg-emerald-500'}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const UserRow = ({ id, name, email, role, status, lastLogin, avatarUrl, onViewDetail, onToggleStatus }: {
  id: string; name: string; email: string; role: string; status: string; lastLogin: string; avatarUrl?: string;
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
      <td className="py-4 px-6 text-admin-on-surface-variant">{lastLogin}</td>
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
