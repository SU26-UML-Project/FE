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
  ChevronLeft,
  ChevronRight,
  Layers,
  Copy,
  Clock,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTemplateList } from '../utils/templates';
import type { TemplateMeta } from '../utils/templates';
import { projectService } from '../services/projectService';
import type { ProjectResponse } from '../types/project';
import type { Workspace, PrebuiltMeta } from '../types/workspace';
import toast from 'react-hot-toast';

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day ago`
  return new Date(iso).toLocaleDateString()
}

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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [prebuilts, setPrebuilts] = useState<PrebuiltMeta[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsCategory, setNewWsCategory] = useState('general');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'all' || activeTab === 'archived' || activeTab === 'trash') {
      fetchWorkspaces();
    }
  }, [activeTab]);

  const fetchWorkspaces = async () => {
    setWorkspacesLoading(true);
    try {
      const response = await projectService.getAllProjects();
      // Map API ProjectResponse to Frontend Workspace type
      const mapped = (response.result || []).map((p: ProjectResponse) => {
        // Count sheets from projectData
        let sheetCount = 0;
        if (p.projectData) {
          try {
            // Try parsing as JSON first (new format)
            const data = JSON.parse(p.projectData);
            sheetCount = Array.isArray(data) ? data.length : 1;
          } catch (e) {
            // Fallback for legacy XML format or other data
            sheetCount = 1;
          }
        } else {
          sheetCount = 0;
        }

        return {
          id: p.id,
          name: p.projectName,
          category: p.description || 'general',
          type: 'user' as const,
          documents: [],
          // Create a mock sheet array with the correct length to satisfy the UI
          sheets: Array(sheetCount).fill({ id: 'mock', name: 'Page', diagramType: 'blank', diagramXml: '' }),
          aiContext: { intent: '', clarifications: [], history: [] },
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });
      setWorkspaces(mapped);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load projects');
      setWorkspaces([]);
    } finally {
      setWorkspacesLoading(false);
    }
  };

  useEffect(() => {
    fetch('/prebuilts/index.json')
      .then(r => r.json())
      .then(setPrebuilts)
      .catch(() => setPrebuilts([]))
  }, []);

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return
    
    try {
      const emptyXml = '<mxfile><diagram id="L1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>';
      const response = await projectService.createProject({
        projectName: newWsName.trim(),
        description: newWsCategory,
        projectData: emptyXml
      });
      
      if (response.code === 200) {
        toast.success('Project created successfully');
        fetchWorkspaces();
        setShowCreateModal(false);
        setNewWsName('');
        setNewWsCategory('general');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isAllSelected = workspaces.length > 0 && selectedIds.size === workspaces.length;

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setShowConfirm(true);
  }

  const handleAllClick = () => {
    if (!isAllSelected) {
      setSelectedIds(new Set(workspaces.map(w => w.id)));
    }
    setShowConfirm(true);
  }

  const handleConfirmDelete = async () => {
    setShowConfirm(false);
    try {
      await projectService.deleteProjects([...selectedIds]);
      toast.success(`${selectedIds.size} project(s) deleted`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      fetchWorkspaces();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete projects');
    }
  }

  return (
    <div className="bg-admin-bg text-admin-on-surface font-priego h-screen flex overflow-hidden pt-[72px]">
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
                      <h1 className="text-4xl font-black tracking-tight text-black mb-2">My Workspaces</h1>
                      <p className="text-lg text-admin-on-surface-variant">Create and manage your architectural design workspaces.</p>
                    </>
                  )}
                </div>


                {/* Grid/List Toggle */}
                <div className="flex items-center gap-3">
                  {activeTab !== 'templates' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-uml-blue text-white font-bold rounded-md text-sm hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Plus size={16} />
                      New Workspace
                    </button>
                  )}
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
            ) : (
              <>
                {/* My Workspaces */}
                <section className="mb-12">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-black">
                      My Workspaces
                      <span className="ml-2 text-sm font-normal text-gray-400">({workspaces.length})</span>
                    </h2>
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                      className={`flex items-center border-2 rounded-full bg-white ${
                        selectionMode ? 'border-gray-300 px-1.5 py-1' : 'border-gray-300'
                      }`}
                    >
                      <AnimatePresence mode="popLayout">
                        {selectionMode && (
                          <motion.div
                            key="red-pill"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 120, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="flex items-center overflow-hidden bg-red-600 rounded-full h-8"
                          >
                            <div className="flex items-center h-full shrink-0" style={{ width: 120 }}>
                              <button
                                onClick={handleDeleteClick}
                                disabled={selectedIds.size === 0}
                                className={`h-full font-bold text-xs whitespace-nowrap flex-[7] flex items-center justify-center ${selectedIds.size === 0 ? 'text-gray-400' : 'text-white'}`}
                              >
                                Delete
                              </button>
                              <div className="w-[1px] h-5 bg-white/80 shrink-0" />
                              <button
                                onClick={handleAllClick}
                                className="h-full font-bold text-xs whitespace-nowrap flex-[3] flex items-center justify-center text-white"
                              >
                                All
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) setSelectedIds(new Set()); }}
                        className={`flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                          selectionMode
                            ? 'px-3 py-1 text-gray-500 hover:text-gray-700'
                            : 'w-9 h-9 text-gray-400 hover:text-red-500 hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                        }`}
                        title="Delete projects"
                      >
                        {selectionMode ? 'Cancel' : <Trash2 size={16} />}
                      </button>
                    </motion.div>
                  </div>
                  {workspacesLoading ? (
                    <div className="flex items-center justify-center py-20 bg-white border border-admin-outline rounded-sm">
                      <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-admin-outline rounded-sm">
                      <Folder size={48} className="text-gray-200 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-gray-400 mb-1">No workspaces yet</h3>
                      <p className="text-sm text-gray-300 mb-4">Create your first workspace to get started.</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-uml-blue text-white font-bold rounded-md text-sm hover:bg-blue-700 transition"
                      >
                        Create Workspace
                      </button>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {workspaces.map((ws) => (
                        <UserWorkspaceCard
                          key={ws.id}
                          workspace={ws}
                          selectionMode={selectionMode}
                          selected={selectedIds.has(ws.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                            <th className="py-4 px-6">Workspace Name</th>
                            <th className="py-4 px-6">Category</th>
                            <th className="py-4 px-6">Last Edited</th>
                            <th className="py-4 px-6 text-right">Diagrams</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workspaces.map((ws) => (
                            <WorkspaceListRow
                              key={ws.id}
                              workspace={ws}
                              selectionMode={selectionMode}
                              selected={selectedIds.has(ws.id)}
                              onToggleSelect={handleToggleSelect}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Prebuilt Projects */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-black">
                      Prebuilt Projects
                      <span className="ml-2 text-sm font-normal text-gray-400">({prebuilts.length})</span>
                    </h2>
                  </div>
                  {prebuilts.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-admin-outline rounded-sm">
                      <Copy size={48} className="text-gray-200 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-gray-400 mb-1">No prebuilt projects</h3>
                      <p className="text-sm text-gray-300">Check back later for ready-made project templates.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {prebuilts.map((p) => (
                        <PrebuiltCard key={p.id} meta={p} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        name={newWsName}
        onNameChange={setNewWsName}
        category={newWsCategory}
        onCategoryChange={setNewWsCategory}
        onCreate={handleCreateWorkspace}
      />

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 250, damping: 25 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            >
              <h3 className="text-lg font-bold text-black mb-2">Delete projects?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete {selectedIds.size} project(s)? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowConfirm(false); setSelectedIds(new Set()); setSelectionMode(false); }}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

interface CardActions {
  selectionMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}

const UserWorkspaceCard = ({ workspace, selectionMode, selected, onToggleSelect }: { workspace: Workspace } & CardActions) => {
  const navigate = useNavigate()
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => {
        if (selectionMode) {
          onToggleSelect(workspace.id)
        } else {
          navigate(`/workspace/${workspace.id}`)
        }
      }}
      className={`bg-white border rounded flex flex-col group transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden h-[260px] ${
        selected ? 'border-red-400 ring-2 ring-red-400/25' : 'border-admin-outline hover:border-uml-blue'
      }`}
    >
      <div className="h-36 bg-gradient-to-br from-gray-50 to-blue-50 border-b border-admin-outline relative overflow-hidden">
        <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
        <div className="absolute top-3 right-3 flex gap-1.5">
          <span className="px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border bg-uml-blue/10 text-uml-blue border-uml-blue/20">
            {workspace.category}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1">{workspace.name}</h3>
          <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest">{workspace.sheets.length} diagrams</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <Clock size={12} />
          {formatRelativeTime(workspace.updatedAt)}
        </div>
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-red-50/80 z-20 flex items-center justify-center"
        >
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trash2 size={28} className="text-red-500/80" />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}

interface RowActions {
  selectionMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}

const WorkspaceListRow = ({ workspace, selectionMode, selected, onToggleSelect }: { workspace: Workspace } & RowActions) => {
  const navigate = useNavigate()
  return (
    <tr
      onClick={() => {
        if (selectionMode) {
          onToggleSelect(workspace.id)
        } else {
          navigate(`/workspace/${workspace.id}`)
        }
      }}
      className={`relative overflow-hidden border-b transition-colors group cursor-pointer ${
        selected ? 'border-red-400 bg-red-50/50' : 'border-admin-outline hover:bg-gray-50/50'
      }`}
    >
      {selected && selectionMode && (
        <td className="absolute inset-0 z-20 flex items-center justify-center bg-red-50/80" colSpan={4}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trash2 size={20} className="text-red-500/80" />
          </motion.div>
        </td>
      )}
      <td className="py-4 px-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 bg-uml-blue/10 text-uml-blue">
            <Layers size={18} />
          </div>
          <span className="font-bold text-black group-hover:text-uml-blue transition-colors">{workspace.name}</span>
        </div>
      </td>
      <td className="py-4 px-6 text-[12px] text-admin-secondary font-bold uppercase">{workspace.category}</td>
      <td className="py-4 px-6 text-admin-on-surface-variant font-bold text-[12px] uppercase">{formatRelativeTime(workspace.updatedAt)}</td>
      <td className="py-4 px-6 text-right text-[12px] text-admin-secondary font-bold">{workspace.sheets.length}</td>
    </tr>
  )
}

const PrebuiltCard = ({ meta }: { meta: PrebuiltMeta }) => {
  const navigate = useNavigate()
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/prebuilts/${meta.id}`)}
      className="bg-white border border-admin-outline rounded flex flex-col group hover:border-uml-blue transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden h-[260px]"
    >
      <div className={`h-36 bg-gradient-to-br ${
        meta.difficulty === 'beginner' ? 'from-emerald-50 to-green-50' :
        meta.difficulty === 'intermediate' ? 'from-amber-50 to-orange-50' :
        'from-red-50 to-rose-50'
      } border-b border-admin-outline relative overflow-hidden`}>
        <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
        <div className="absolute top-3 right-3 flex gap-1.5">
          <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border ${
            meta.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
            meta.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-600 border-amber-200' :
            'bg-red-100 text-red-600 border-red-200'
          }`}>
            {meta.difficulty}
          </span>
        </div>
        <div className="absolute top-3 left-3 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-400">
          <Copy size={16} />
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1">{meta.name}</h3>
          <p className="text-xs text-admin-secondary leading-relaxed line-clamp-2">{meta.summary}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="font-bold uppercase tracking-widest">{meta.domain}</span>
        </div>
      </div>
    </motion.div>
  )
}

{/* Create Workspace Modal */}
const CreateWorkspaceModal = ({
  isOpen,
  onClose,
  name,
  onNameChange,
  category,
  onCategoryChange,
  onCreate,
}: {
  isOpen: boolean
  onClose: () => void
  name: string
  onNameChange: (v: string) => void
  category: string
  onCategoryChange: (v: string) => void
  onCreate: () => void
}) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
      >
        <h2 className="text-xl font-black text-black mb-2">Create New Workspace</h2>
        <p className="text-sm text-gray-500 mb-6">A workspace contains diagrams, documents, and AI context for your project.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Workspace Name</label>
            <input
              value={name}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onCreate() }}
              placeholder="e.g., E-Commerce Platform"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 bg-white"
            >
              <option value="general">General</option>
              <option value="e-commerce">E-Commerce</option>
              <option value="healthcare">Healthcare</option>
              <option value="fintech">Fintech</option>
              <option value="education">Education</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!name.trim()}
            className="px-5 py-2 bg-uml-blue text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            Create Workspace
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default UserDashboard;
