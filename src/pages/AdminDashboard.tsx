import React from 'react';
import { 
  Plus, 
  FolderOpen, 
  Users, 
  BarChart3, 
  Settings, 
  LifeBuoy, 
  BookOpen, 
  Search, 
  Bell, 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  MoreVertical,
  UserPlus,
  Trash2,
  ShieldCheck,
  Mail,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'analytics' | 'users'>('analytics');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  return (
    <div className="bg-admin-bg text-admin-on-surface font-priego h-screen flex overflow-hidden">
      {/* Blueprint Grid Utility is already in index.css, we'll reuse it or add it if needed */}
      <div className="absolute inset-0 grid-background opacity-30 pointer-events-none" />

      {/* SideNavBar */}
      <nav 
        className={`bg-[#f0f4f7] border-r border-admin-outline flex flex-col h-full py-5 shrink-0 z-10 hidden md:flex transition-all duration-300 relative ${isSidebarCollapsed ? 'w-[80px]' : 'w-[280px]'}`}
      >
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-admin-outline rounded-full flex items-center justify-center text-admin-secondary hover:text-uml-blue shadow-sm z-20 transition-transform active:scale-90"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Header */}
        <div className={`px-6 mb-10 flex items-center gap-3 transition-all duration-300 ${isSidebarCollapsed ? 'px-4 justify-center' : ''}`}>
          <div className="w-10 h-10 bg-uml-blue rounded flex items-center justify-center text-white font-bold text-xl shrink-0">
            SA
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-bold text-lg leading-tight">System Admin</h2>
              <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest mt-1">Enterprise Tier</p>
            </div>
          )}
        </div>

        {/* Main Tabs */}
        <div className={`flex-1 px-4 space-y-2 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Analytics" 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')} 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Users" 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            collapsed={isSidebarCollapsed}
          />
        </div>

        {/* Footer Tabs */}
        <div className={`px-4 mt-auto space-y-1 border-t border-admin-outline pt-4 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <NavItem icon={<LifeBuoy size={18} />} label="Support" small collapsed={isSidebarCollapsed} />
          <NavItem icon={<BookOpen size={18} />} label="Documentation" small collapsed={isSidebarCollapsed} />
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* TopNavBar */}
        <header className="bg-white border-b border-admin-outline flex justify-between items-center w-full px-6 h-16 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-xl font-extrabold tracking-tight text-black">UML Diagram</span>
            <div className="hidden md:flex items-center bg-gray-50 rounded border border-admin-outline px-3 py-1.5 ml-8 w-[300px] focus-within:border-uml-blue focus-within:ring-2 focus-within:ring-uml-blue/10 transition-all">
              <Search size={18} className="text-gray-400 mr-2" />
              <input 
                className="bg-transparent border-none outline-none w-full text-sm placeholder:text-gray-400 p-0" 
                placeholder="Search projects, users..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton icon={<Bell size={20} />} />
            <IconButton icon={<HelpCircle size={20} />} />
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
          <div className="max-w-[1200px] mx-auto">
            {activeTab === 'analytics' ? (
              <>
                {/* Page Header */}
                <div className="mb-10">
                  <h1 className="text-4xl font-black tracking-tight text-black">Analytics Overview</h1>
                  <p className="text-lg text-admin-on-surface-variant mt-2">Monitor system health and project metrics.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <StatCard title="Total Diagrams" value="14,208" trend="+12%" />
                  <StatCard title="Active Users" value="3,842" trend="+5%" />
                  <StatCard title="Storage Used (GB)" value="845.2" trend="+18%" negative />
                  <StatCard title="Active Subscriptions" value="1,204" trend="0%" neutral />
                </div>

                {/* Bento Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Projects Table */}
                  <div className="lg:col-span-2 bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-admin-outline flex justify-between items-center bg-gray-50/50">
                      <h2 className="text-xl font-bold text-black">Recent Projects</h2>
                      <button className="text-[12px] font-bold text-uml-blue hover:underline uppercase tracking-wider">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                            <th className="py-4 px-6">Project Name</th>
                            <th className="py-4 px-6">Creator</th>
                            <th className="py-4 px-6">Last Modified</th>
                            <th className="py-4 px-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <ProjectRow name="Core Authentication Flow" creator="Sarah Jenkins" time="2 hours ago" status="Published" />
                          <ProjectRow name="Database Schema v4" creator="Mike Chen" time="Yesterday" status="Draft" />
                          <ProjectRow name="Payment Gateway Integration" creator="Alex Rivera" time="Oct 12, 2023" status="Published" />
                          <ProjectRow name="Legacy System Migration" creator="Sarah Jenkins" time="Sep 28, 2023" status="Archived" />
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* System Health Widget */}
                  <div className="bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden relative">
                    <div className="p-6 border-b border-admin-outline flex justify-between items-center bg-white z-10">
                      <h2 className="text-xl font-bold text-black">System Health</h2>
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col z-10 bg-white/90 backdrop-blur-sm">
                      <HealthBar label="Server Load" value={42} />
                      <HealthBar label="API Latency" value={20} valueLabel="124ms" color="emerald" />
                      
                      <div className="mt-auto pt-4 border-t border-admin-outline">
                        <p className="text-[11px] text-admin-secondary font-bold uppercase flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          All systems operational. Last checked 2 min ago.
                        </p>
                      </div>
                    </div>
                    {/* Decorative Pattern */}
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-admin-surface opacity-10 pointer-events-none transform translate-x-4 translate-y-4" 
                      style={{ backgroundImage: 'linear-gradient(45deg, #c3c6d7 25%, transparent 25%, transparent 50%, #c3c6d7 50%, #c3c6d7 75%, transparent 75%, transparent)', backgroundSize: '8px 8px' }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* User Management Header */}
                <div className="mb-10 flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black tracking-tight text-black">User Management</h1>
                    <p className="text-lg text-admin-on-surface-variant mt-2">Manage user accounts, roles, and permissions.</p>
                  </div>
                  <button className="bg-uml-blue text-white font-bold text-[14px] uppercase px-6 py-3 rounded flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95">
                    <UserPlus size={18} />
                    Add New User
                  </button>
                </div>

                {/* User List Table */}
                <div className="bg-white border border-admin-outline rounded-sm flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-admin-outline flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 gap-4">
                    <h2 className="text-xl font-bold text-black">All Users</h2>
                    <div className="flex items-center bg-white rounded border border-admin-outline px-3 py-1.5 w-full md:w-[300px] focus-within:border-uml-blue transition-all">
                      <Search size={16} className="text-gray-400 mr-2" />
                      <input className="bg-transparent border-none outline-none w-full text-sm placeholder:text-gray-400 p-0" placeholder="Filter users..." type="text"/>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
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
                        <UserRow name="Sarah Jenkins" email="sarah.j@enterprise.com" role="Admin" status="Active" lastLogin="2 hours ago" />
                        <UserRow name="Mike Chen" email="mike.c@dev.team" role="Editor" status="Active" lastLogin="Yesterday" />
                        <UserRow name="Alex Rivera" email="alex.r@design.co" role="Viewer" status="Inactive" lastLogin="3 days ago" />
                        <UserRow name="John Doe" email="john.d@company.com" role="Editor" status="Pending" lastLogin="Never" />
                        <UserRow name="Emily Blunt" email="emily.b@agency.net" role="Admin" status="Active" lastLogin="1 hour ago" />
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, small = false, onClick, collapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, small?: boolean, onClick?: () => void, collapsed?: boolean }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative
      ${active 
        ? 'bg-blue-100/50 text-uml-blue border-r-4 border-uml-blue font-bold' 
        : 'text-admin-secondary hover:bg-gray-100 hover:text-black font-bold'
      }
      ${small ? 'py-2 text-[12px]' : 'text-[13px] uppercase tracking-wider'}
      ${collapsed ? 'justify-center px-0' : ''}
    `}
  >
    <span className={`${active ? 'text-uml-blue' : 'text-gray-400 group-hover:text-black'} transition-colors shrink-0`}>{icon}</span>
    {!collapsed && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
  </button>
);

const IconButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="p-2 rounded-lg hover:bg-gray-100 transition-all text-admin-on-surface-variant active:scale-90">
    {icon}
  </button>
);

const StatCard = ({ title, value, trend, negative = false, neutral = false }: { title: string, value: string, trend: string, negative?: boolean, neutral?: boolean }) => (
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

const ProjectRow = ({ name, creator, time, status }: { name: string, creator: string, time: string, status: string }) => {
  const statusColors: Record<string, string> = {
    Published: 'bg-blue-100 text-uml-blue',
    Draft: 'bg-gray-100 text-gray-600',
    Archived: 'bg-gray-200 text-gray-500'
  };
  return (
    <tr className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group">
      <td className="py-4 px-6 font-bold text-black">{name}</td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{creator}</td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{time}</td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${statusColors[status]}`}>
          {status}
        </span>
      </td>
    </tr>
  );
};

const HealthBar = ({ label, value, valueLabel, color = 'blue' }: { label: string, value: number, valueLabel?: string, color?: 'blue' | 'emerald' }) => (
  <div className="mb-6">
    <div className="flex justify-between items-end mb-2">
      <span className="text-[11px] font-bold text-admin-secondary uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-black">{valueLabel || `${value}%`}</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div 
        className={`h-full transition-all duration-1000 ${color === 'blue' ? 'bg-uml-blue' : 'bg-emerald-500'}`} 
        style={{ width: `${value}%` }} 
      />
    </div>
  </div>
);

const UserRow = ({ name, email, role, status, lastLogin }: { name: string, email: string, role: string, status: string, lastLogin: string }) => {
  const statusColors: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-600',
    Inactive: 'bg-gray-100 text-gray-500',
    Pending: 'bg-amber-100 text-amber-600'
  };
  
  return (
    <tr className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-uml-blue flex items-center justify-center font-bold text-xs">
            {name.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="font-bold text-black">{name}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{email}</td>
      <td className="py-4 px-6">
        <div className="flex items-center gap-1.5 text-admin-on-surface-variant">
          {role === 'Admin' ? <ShieldCheck size={14} className="text-uml-blue" /> : <Users size={14} />}
          {role}
        </div>
      </td>
      <td className="py-4 px-6">
        <span className={`inline-flex items-center px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${statusColors[status]}`}>
          {status}
        </span>
      </td>
      <td className="py-4 px-6 text-admin-on-surface-variant">{lastLogin}</td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end gap-2">
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-uml-blue transition-colors">
            <Mail size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-admin-error transition-colors">
            <Trash2 size={16} />
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
