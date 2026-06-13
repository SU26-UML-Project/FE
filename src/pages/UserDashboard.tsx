import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Folder, 
  Users, 
  LayoutGrid, 
  Archive, 
  Trash2, 
  HelpCircle, 
  CheckCircle2, 
  Grid2X2, 
  List,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTemplateList } from '../utils/templates';
import type { TemplateMeta } from '../utils/templates';

interface Project {
  id: string;
  name: string;
  lastEdited: string;
  status: 'Draft' | 'Live';
  thumbnail: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'System Architecture',
    lastEdited: '2 hrs ago',
    status: 'Draft',
    thumbnail: 'https://images.unsplash.com/photo-1581291417004-63f881857ee1?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '2',
    name: 'Database Schema v2',
    lastEdited: 'Yesterday',
    status: 'Live',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: '3',
    name: 'Auth Flow Sequence',
    lastEdited: '3 days ago',
    status: 'Draft',
    thumbnail: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=2055&auto=format&fit=crop'
  }
];

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('dashboard_tab') || 'all');
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateKind, setTemplateKind] = useState<'knowledge' | 'sample'>(
    () => (sessionStorage.getItem('dashboard_templateKind') as 'knowledge' | 'sample') || 'knowledge'
  );
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateMeta[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => { sessionStorage.setItem('dashboard_tab', activeTab); }, [activeTab]);
  useEffect(() => { sessionStorage.setItem('dashboard_templateKind', templateKind); }, [templateKind]);

  useEffect(() => {
    if (activeTab === 'templates') {
      setTemplatesLoading(true)
      setFilterGroup(null)
      getTemplateList(templateKind)
        .then(setTemplates)
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false))
    }
  }, [activeTab, templateKind]);

  useEffect(() => {
    if (!templates.length) { setFilteredTemplates([]); return; }
    setFilterLoading(true)
    const timer = setTimeout(() => {
      setFilteredTemplates(filterGroup ? templates.filter(t => t.group === filterGroup) : [...templates])
      setFilterLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [filterGroup, templates]);

  return (
    <div className="bg-admin-bg text-admin-on-surface font-priego h-screen flex overflow-hidden pt-[88px]">
      <div className="absolute inset-0 grid-background opacity-30 pointer-events-none" />

      {/* SideNavBar */}
      <aside 
        className={`bg-white border-r border-admin-outline flex flex-col h-[calc(100vh-88px)] py-6 shrink-0 z-40 transition-all duration-300 relative ${isSidebarCollapsed ? 'w-[80px]' : 'w-[280px]'}`}
      >
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white border border-admin-outline rounded-full flex items-center justify-center text-admin-secondary hover:text-uml-blue shadow-sm z-50 transition-transform active:scale-90"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Workspace Header */}
        <div className={`px-6 mb-8 flex items-center gap-3 transition-all duration-300 ${isSidebarCollapsed ? 'px-4 justify-center' : ''}`}>
          <div className="w-10 h-10 rounded bg-uml-blue/10 flex items-center justify-center text-uml-blue border border-uml-blue/20 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3Z"/><path d="M9 3V21"/><path d="M15 3V21"/><path d="M5 9H19"/><path d="M5 15H19"/></svg>
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h2 className="font-bold text-[13px] uppercase tracking-widest text-black">Project Workspace</h2>
              <p className="text-[10px] text-admin-secondary font-bold uppercase tracking-wider">Technical Design</p>
            </div>
          )}
        </div>

        {/* Create Button */}
        <div className={`px-4 mb-8 transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => navigate('/canvas')}
            className={`w-full bg-uml-blue text-white rounded font-bold uppercase transition-all flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md active:scale-95 ${isSidebarCollapsed ? 'h-12 w-12 rounded-full p-0' : 'py-3 px-4 text-[13px]'}`}
          >
            <Plus size={isSidebarCollapsed ? 24 : 18} />
            {!isSidebarCollapsed && "Create New Diagram"}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 px-4 space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <SidebarItem 
            icon={<Folder size={20} />} 
            label="All Projects" 
            active={activeTab === 'all'} 
            onClick={() => setActiveTab('all')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Shared with Me" 
            active={activeTab === 'shared'} 
            onClick={() => setActiveTab('shared')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={<LayoutGrid size={20} />} 
            label="Templates" 
            active={activeTab === 'templates'} 
            onClick={() => { setActiveTab('templates'); setTemplateKind('knowledge'); }} 
            collapsed={isSidebarCollapsed}
          />
          {!isSidebarCollapsed && activeTab === 'templates' && (
            <div className="ml-8 mt-0.5 border-l-2 border-gray-200 pl-3 space-y-0.5">
              <SubSidebarItem
                label="UML Library"
                active={templateKind === 'knowledge'}
                onClick={() => setTemplateKind('knowledge')}
              />
              <SubSidebarItem
                label="Prebuilt Templates"
                active={templateKind === 'sample'}
                onClick={() => setTemplateKind('sample')}
              />
            </div>
          )}
          <SidebarItem 
            icon={<Archive size={20} />} 
            label="Archived" 
            active={activeTab === 'archived'} 
            onClick={() => setActiveTab('archived')} 
            collapsed={isSidebarCollapsed}
          />
          <SidebarItem 
            icon={<Trash2 size={20} />} 
            label="Trash" 
            active={activeTab === 'trash'} 
            onClick={() => setActiveTab('trash')} 
            collapsed={isSidebarCollapsed}
          />
        </nav>

        {/* Bottom Navigation */}
        <div className={`px-4 mt-auto pt-6 border-t border-admin-outline space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <SidebarItem icon={<HelpCircle size={18} />} label="Support" small collapsed={isSidebarCollapsed} />
          <SidebarItem icon={<CheckCircle2 size={18} />} label="System Status" small collapsed={isSidebarCollapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:px-12 relative">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-admin-outline pb-6">
              <div>
                {activeTab === 'templates' ? (
                  <>
                    <h1 className="text-4xl font-black tracking-tight text-black mb-2">Templates</h1>
                    <p className="text-lg text-admin-on-surface-variant">
                      {templateKind === 'knowledge'
                        ? 'Learn about each UML diagram type — purpose, elements, when to use, and comparisons.'
                        : 'Pre-built diagram templates tied to real-world projects. Use as a starting point.'}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl font-black tracking-tight text-black mb-2">Recent Diagrams</h1>
                    <p className="text-lg text-admin-on-surface-variant">Pick up where you left off or start a new architectural design.</p>
                  </>
                )}
              </div>
              
              {/* Grid/List Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-uml-blue' : 'text-gray-500 hover:text-black'}`}
                >
                  <Grid2X2 size={20} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-uml-blue' : 'text-gray-500 hover:text-black'}`}
                >
                  <List size={20} />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            {activeTab === 'templates' && !templatesLoading && templates.length > 0 && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button
                  onClick={() => setFilterGroup(null)}
                  className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-widest border transition-all ${
                    !filterGroup
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {[...new Set(templates.map(t => t.group))].map(g => (
                  <button
                    key={g}
                    onClick={() => setFilterGroup(g)}
                    className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-widest border transition-all ${
                      filterGroup === g
                        ? groupColors[g] + ' shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {g === 'structural' ? 'Structural' : g === 'behavioral' ? 'Behavioral' : 'C4 Model'}
                  </button>
                ))}
              </div>
            )}

            {/* Diagrams Display */}
            {activeTab === 'templates' ? (
              templatesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20">
                  <Layers size={48} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-400 mb-1">No templates yet</h3>
                  <p className="text-sm text-gray-300">Templates are being prepared.</p>
                </div>
              ) : filterLoading ? (
                <div className="flex items-center justify-center py-20 bg-white border border-admin-outline rounded-sm">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">Filtering...</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${templateKind}-${viewMode}-${filterGroup || 'all'}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((tpl, i) => (
                          <motion.div
                            key={tpl.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.035, duration: 0.3 }}
                          >
                            <TemplateGridCard template={tpl} />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                              <th className="py-4 px-6">Template Name</th>
                              <th className="py-4 px-6">Type</th>
                              <th className="py-4 px-6">Category</th>
                              <th className="py-4 px-6 text-right">Nodes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTemplates.map((tpl, i) => (
                              <TemplateListRow key={tpl.id} template={tpl} index={i} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockProjects.map(project => (
                  <ProjectGridCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                      <th className="py-4 px-6">Diagram Name</th>
                      <th className="py-4 px-6">Last Edited</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockProjects.map(project => (
                      <ProjectListRow key={project.id} project={project} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active = false, small = false, onClick, collapsed = false }: { icon: React.ReactNode, label: string, active?: boolean, small?: boolean, onClick?: () => void, collapsed?: boolean }) => (
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



const SubSidebarItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-1.5 rounded text-[12px] font-bold uppercase tracking-wider transition-all ${
      active
        ? 'text-uml-blue bg-blue-50/50'
        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
)

const ProjectGridCard = ({ project }: { project: Project }) => (
  <div className="bg-white border border-admin-outline rounded flex flex-col group hover:border-uml-blue transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden h-[300px]">
    <div className="h-44 bg-gray-50 border-b border-admin-outline relative overflow-hidden">
      <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
      <img 
        src={project.thumbnail} 
        alt={project.name} 
        className="w-full h-full object-cover mix-blend-multiply opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
      />
      <div className="absolute top-3 right-3">
        <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm ${project.status === 'Live' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-blue-100 text-uml-blue border border-blue-200'}`}>
          {project.status}
        </span>
      </div>
    </div>
    <div className="p-5 flex-1 flex flex-col justify-between">
      <div>
        <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1">{project.name}</h3>
        <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest">Last edited {project.lastEdited}</p>
      </div>
      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  </div>
);

const ProjectListRow = ({ project }: { project: Project }) => (
  <tr className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group cursor-pointer">
    <td className="py-4 px-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-10 bg-gray-100 rounded border border-admin-outline overflow-hidden relative shrink-0">
          <div className="absolute inset-0 blueprint-grid opacity-20" />
          <img src={project.thumbnail} alt="" className="w-full h-full object-cover mix-blend-multiply" />
        </div>
        <span className="font-bold text-black group-hover:text-uml-blue transition-colors">{project.name}</span>
      </div>
    </td>
    <td className="py-4 px-6 text-admin-on-surface-variant font-bold text-[12px] uppercase">{project.lastEdited}</td>
    <td className="py-4 px-6">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest ${project.status === 'Live' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-uml-blue'}`}>
        {project.status}
      </span>
    </td>
    <td className="py-4 px-6 text-right">
      <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
        <MoreVertical size={18} />
      </button>
    </td>
  </tr>
);

const groupColors: Record<string, string> = {
  structural: 'bg-amber-100 text-amber-700 border-amber-200',
  behavioral: 'bg-blue-100 text-blue-700 border-blue-200',
  c4: 'bg-purple-100 text-purple-700 border-purple-200',
}

const groupGradients: Record<string, string> = {
  structural: 'from-amber-50 via-amber-100/30 to-orange-50/30',
  behavioral: 'from-blue-50 via-indigo-50/30 to-sky-50/30',
  c4: 'from-purple-50 via-violet-50/30 to-fuchsia-50/30',
}

const iconColors: Record<string, string> = {
  structural: 'bg-amber-50 text-amber-600',
  behavioral: 'bg-blue-50 text-blue-600',
  c4: 'bg-purple-50 text-purple-600',
}

const TemplateGridCard = ({ template }: { template: TemplateMeta }) => {
  const navigate = useNavigate()
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/templates/${template.id}`)}
      className="bg-white border border-admin-outline rounded flex flex-col group hover:border-uml-blue transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden h-[300px]"
    >
      <div className={`h-44 bg-gradient-to-br ${groupGradients[template.group] || 'from-gray-50 to-gray-100'} border-b border-admin-outline relative overflow-hidden`}>
        <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
        <div className="absolute top-3 right-3 flex gap-1.5">
          <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border ${groupColors[template.group] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {template.type}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1">{template.name}</h3>
          <p className="text-xs text-admin-secondary leading-relaxed line-clamp-2">{template.shortDescription}</p>
        </div>
        <div className="flex items-center justify-between">
          {template.kind === 'sample' && (
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{template.nodeCount} nodes · {template.edgeCount} edges</span>
          )}
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{template.category}</span>
        </div>
      </div>
    </motion.div>
  )
}

const TemplateListRow = ({ template, index = 0 }: { template: TemplateMeta; index?: number }) => {
  const navigate = useNavigate()
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onClick={() => navigate(`/templates/${template.id}`)}
      className="border-b border-admin-outline hover:bg-gray-50/50 transition-colors group cursor-pointer"
    >
      <td className="py-4 px-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${iconColors[template.group] || 'bg-uml-blue/10 text-uml-blue'}`}>
            <Layers size={18} />
          </div>
          <div>
            <span className="font-bold text-black group-hover:text-uml-blue transition-colors">{template.name}</span>
            <p className="text-xs text-gray-400 mt-0.5">{template.shortDescription}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border ${groupColors[template.group] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {template.type}
        </span>
      </td>
      <td className="py-4 px-6 text-sm text-admin-secondary font-bold">{template.category}</td>
      <td className="py-4 px-6 text-right text-[12px] text-admin-secondary font-bold">
        {template.kind === 'sample' ? `${template.nodeCount}` : '—'}
      </td>
    </motion.tr>
  )
}

export default UserDashboard;
