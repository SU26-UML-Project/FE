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
    PenTool,
    PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTemplateList } from '../../../shared/lib/templates';
import type { TemplateMeta } from '../../../shared/lib/templates';
import { projectService, sheetService } from '../../../services';
import { workspaceFileService } from '../../workspace/api/workspaceFileService';
import { workspaceItemService } from '../../workspace/api/workspaceItemService';
import type { ProjectResponse } from '../../../types/project';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../shared/lib/errorMessage';
import UsageModal from '../../billing/components/UsageModal';

// Dummy types to fix errors since I deleted workspace.ts
interface Workspace {
    id: string;
    name: string;
    category: string;
    updatedAt: string;
    sheets?: any[];
    diagramCount: number;
    markdownCount: number;
    totalFiles: number;
    // Metadata thùng rác (chỉ có khi activeTab === 'trash')
    deletedAt?: string;
    deletedByName?: string;
    daysRemaining?: number;
}
interface PrebuiltMeta {
    id: string;
    name: string;
    domain: string;
    summary: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    coverImage?: string;
    tags: string[];
}

const formatRelativeTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} giờ trước`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} ngày trước`
    return new Date(iso).toLocaleDateString('vi-VN')
}


function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="mt-6 flex items-center justify-center gap-4">
            <button
                onClick={() => onChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md border border-admin-outline bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
                <ChevronLeft size={16} /> Trước
            </button>
            <span className="text-sm text-gray-500">Trang {page + 1} / {totalPages}</span>
            <button
                onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 rounded-md border border-admin-outline bg-white px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
                Sau <ChevronRight size={16} />
            </button>
        </div>
    );
}

const UserDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [usageOpen, setUsageOpen] = useState(false);
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
    const [drafts, setDrafts] = useState<Workspace[]>([]);
    const [draftsLoading, setDraftsLoading] = useState(false);
    const [wsPage, setWsPage] = useState(0);
    const [wsTotalPages, setWsTotalPages] = useState(1);
    const [draftsPage, setDraftsPage] = useState(0);
    const [draftsTotalPages, setDraftsTotalPages] = useState(1);
    const PROJECT_PAGE_SIZE = 12;
    const [prebuilts, setPrebuilts] = useState<PrebuiltMeta[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [newWsCategory, setNewWsCategory] = useState('general');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showConfirm, setShowConfirm] = useState(false);
    const [draftSelectionMode, setDraftSelectionMode] = useState(false);
    const [draftSelectedIds, setDraftSelectedIds] = useState<Set<string>>(new Set());
    const [showDraftConfirm, setShowDraftConfirm] = useState(false);
    // Xóa vĩnh viễn 1 dự án (yêu cầu gõ đúng tên) + Dọn sạch thùng rác
    const [permDeleteTarget, setPermDeleteTarget] = useState<Workspace | null>(null);
    const [permDeleteInput, setPermDeleteInput] = useState('');
    const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

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
        if (activeTab === 'drafts') {
            fetchDrafts();
        }
    }, [activeTab]);

    const fetchWorkspaces = async () => {
        setWorkspacesLoading(true);
        try {
            let response;
            if (activeTab === 'archived') {
                response = await projectService.getArchivedProjects({ page: wsPage, size: PROJECT_PAGE_SIZE });
            } else if (activeTab === 'trash') {
                response = await projectService.getTrashProjects({ page: wsPage, size: PROJECT_PAGE_SIZE });
            } else {
                response = await projectService.getAllProjects({ isDraft: false, page: wsPage, size: PROJECT_PAGE_SIZE });
            }

            const projects = response.result?.content || [];
            setWsTotalPages(response.result?.totalPages || 1);

            // Fetch file and sheet counts for active projects, use DTO counts for soft-deleted trash projects
            const projectWithSheets = await Promise.all(
                projects.map(async (p: ProjectResponse) => {
                    if (activeTab === 'trash') {
                        const count = p.diagramCount || 0;
                        return {
                            id: p.id,
                            name: p.projectName,
                            category: p.description || 'general',
                            updatedAt: p.updatedAt,
                            sheets: [],
                            diagramCount: count,
                            markdownCount: 0,
                            totalFiles: count,
                            deletedAt: p.deletedAt,
                            deletedByName: p.deletedByName,
                            daysRemaining: p.daysRemaining,
                        };
                    }

                    try {
                        const [sheetsRes, itemsRes] = await Promise.all([
                            sheetService.getSheetsByProject(p.id).catch(() => ({ result: [] })),
                            workspaceItemService.list(p.id).catch(() => ({ result: [] }))
                        ]);
                        const sheets = sheetsRes.result || [];
                        const rawItems = itemsRes.result || [];

                        let diagramCount = 0;
                        let markdownCount = 0;

                        if (rawItems.length > 0) {
                            diagramCount = rawItems.filter((i: any) => (i.kind || "").toUpperCase() === 'DIAGRAM').length;
                            markdownCount = rawItems.filter((i: any) => (i.kind || "").toUpperCase() === 'MARKDOWN').length;
                        } else {
                            diagramCount = sheets.length;
                            markdownCount = 0;
                        }

                        const totalFiles = diagramCount + markdownCount;

                        return {
                            id: p.id,
                            name: p.projectName,
                            category: p.description || 'general',
                            updatedAt: p.updatedAt,
                            sheets,
                            diagramCount,
                            markdownCount,
                            totalFiles
                        };
                    } catch (e) {
                        return {
                            id: p.id,
                            name: p.projectName,
                            category: p.description || 'general',
                            updatedAt: p.updatedAt,
                            sheets: [],
                            diagramCount: 0,
                            markdownCount: 0,
                            totalFiles: 0
                        };
                    }
                })
            );

            setWorkspaces(projectWithSheets);
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải dự án');
            setWorkspaces([]);
        } finally {
            setWorkspacesLoading(false);
        }
    };

    // Toast "Hoàn tác" 10 giây sau khi xóa mềm — gọi restore cho đúng các id vừa xóa.
    const showUndoToast = (ids: string[], reload: () => void) => {
        toast((t) => (
            <div className="flex items-center gap-3">
                <span className="text-sm">Đã chuyển {ids.length} dự án vào thùng rác</span>
                <button
                    onClick={async () => {
                        toast.dismiss(t.id);
                        try {
                            await Promise.all(ids.map(id => projectService.restoreProject(id)));
                            toast.success('Đã hoàn tác');
                            reload();
                        } catch (e) {
                            toast.error(getErrorMessage(e, 'Hoàn tác thất bại'));
                        }
                    }}
                    className="font-bold text-uml-blue hover:underline whitespace-nowrap"
                >
                    Hoàn tác
                </button>
            </div>
        ), { duration: 10000 });
    };

    const handleRestoreProject = async (projectId: string) => {
        const snapshot = workspaces;
        setWorkspaces(prev => prev.filter(w => w.id !== projectId)); // optimistic
        try {
            await projectService.restoreProject(projectId);
            toast.success("Khôi phục dự án thành công");
        } catch (e) {
            setWorkspaces(snapshot); // rollback
            toast.error(getErrorMessage(e, "Không thể khôi phục dự án"));
        }
    };

    // Xóa vĩnh viễn 1 dự án SAU KHI người dùng gõ đúng tên trong dialog.
    const handleConfirmPermanentDelete = async () => {
        const target = permDeleteTarget;
        if (!target) return;
        setPermDeleteTarget(null);
        setPermDeleteInput('');
        const snapshot = workspaces;
        setWorkspaces(prev => prev.filter(w => w.id !== target.id)); // optimistic
        try {
            await projectService.permanentDeleteProject(target.id);
            toast.success("Đã xóa vĩnh viễn dự án");
        } catch (e) {
            setWorkspaces(snapshot); // rollback
            toast.error(getErrorMessage(e, "Không thể xóa vĩnh viễn dự án"));
        }
    };

    // Mở dialog xác nhận (gõ tên) cho card thùng rác.
    const handlePermanentDelete = (projectId: string) => {
        const ws = workspaces.find(w => w.id === projectId);
        if (ws) setPermDeleteTarget(ws);
    };

    const handleEmptyTrash = async () => {
        setShowEmptyTrashConfirm(false);
        const snapshot = workspaces;
        setWorkspaces([]); // optimistic
        try {
            await projectService.emptyTrash();
            toast.success('Đã dọn sạch thùng rác');
        } catch (e) {
            setWorkspaces(snapshot); // rollback
            toast.error(getErrorMessage(e, 'Không thể dọn sạch thùng rác'));
        }
    };

    const handleRestoreBulk = async () => {
        if (selectedIds.size === 0) return;
        const ids = [...selectedIds];
        const snapshot = workspaces;
        setWorkspaces(prev => prev.filter(w => !selectedIds.has(w.id))); // optimistic
        setSelectedIds(new Set());
        setSelectionMode(false);
        try {
            await Promise.all(ids.map(id => projectService.restoreProject(id)));
            toast.success(`Đã khôi phục ${ids.length} dự án`);
        } catch (e) {
            setWorkspaces(snapshot); // rollback
            toast.error(getErrorMessage(e, "Khôi phục thất bại"));
        }
    };

    const handlePermanentDeleteBulk = async () => {
        if (selectedIds.size === 0) return;
        const ids = [...selectedIds];
        const snapshot = workspaces;
        setWorkspaces(prev => prev.filter(w => !selectedIds.has(w.id))); // optimistic
        setSelectedIds(new Set());
        setSelectionMode(false);
        try {
            await Promise.all(ids.map(id => projectService.permanentDeleteProject(id)));
            toast.success(`Đã xóa vĩnh viễn ${ids.length} dự án`);
        } catch (e) {
            setWorkspaces(snapshot); // rollback
            toast.error(getErrorMessage(e, "Xóa vĩnh viễn thất bại"));
        }
    };

    const handleToggleArchiveBulk = async () => {
        if (selectedIds.size === 0) return;
        try {
            await Promise.all([...selectedIds].map(id => projectService.toggleArchive(id)));
            toast.success(`Đã cập nhật trạng thái lưu trữ`);
            setSelectedIds(new Set());
            setSelectionMode(false);
            fetchWorkspaces();
        } catch (e) {
            toast.error(getErrorMessage(e, "Cập nhật lưu trữ thất bại"));
        }
    };

    const handleToggleArchive = async (projectId: string) => {
        try {
            const res = await projectService.toggleArchive(projectId);
            toast.success(res.message || "Đã cập nhật trạng thái lưu trữ");
            fetchWorkspaces();
        } catch (e) {
            toast.error(getErrorMessage(e, "Không thể cập nhật trạng thái lưu trữ"));
        }
    };

    const fetchDrafts = async () => {
        setDraftsLoading(true);
        try {
            const response = await projectService.getAllProjects({ isDraft: true, page: draftsPage, size: PROJECT_PAGE_SIZE });
            const projects = response.result?.content || [];
            setDraftsTotalPages(response.result?.totalPages || 1);

            // Fetch sheet counts for all drafts
            const draftsWithSheets = await Promise.all(
                projects.map(async (p: ProjectResponse) => {
                    try {
                        const sheetsRes = await sheetService.getSheetsByProject(p.id);
                        return {
                            id: p.id,
                            name: p.projectName,
                            category: p.description || 'draft',
                            updatedAt: p.updatedAt,
                            sheets: sheetsRes.result || []
                        };
                    } catch (e) {
                        return {
                            id: p.id,
                            name: p.projectName,
                            category: p.description || 'draft',
                            updatedAt: p.updatedAt,
                            sheets: []
                        };
                    }
                })
            );

            setDrafts(draftsWithSheets);
        } catch (error: any) {
            toast.error(error.message || 'Không thể tải bản nháp');
            setDrafts([]);
        } finally {
            setDraftsLoading(false);
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
                toast.success('Tạo dự án thành công');
                setShowCreateModal(false);
                setNewWsName('');
                setNewWsCategory('general');
                navigate(`/workspace/${response.result.id}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Không thể tạo dự án');
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
        } else {
            setSelectedIds(new Set());
        }
    }

    const handleConfirmDelete = async () => {
        setShowConfirm(false);
        const ids = [...selectedIds];
        try {
            await projectService.deleteProjects(ids);
            setSelectedIds(new Set());
            setSelectionMode(false);
            fetchWorkspaces();
            showUndoToast(ids, fetchWorkspaces);
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Không thể xoá dự án'));
        }
    }

    const isAllDraftsSelected = drafts.length > 0 && draftSelectedIds.size === drafts.length;

    const handleToggleDraftSelect = (id: string) => {
        setDraftSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const handleDraftDeleteClick = () => {
        if (draftSelectedIds.size === 0) return;
        setShowDraftConfirm(true);
    }

    const handleAllDraftsClick = () => {
        if (!isAllDraftsSelected) {
            setDraftSelectedIds(new Set(drafts.map(d => d.id)));
        }
        setShowDraftConfirm(true);
    }

    const handleConfirmDraftDelete = async () => {
        setShowDraftConfirm(false);
        const ids = [...draftSelectedIds];
        try {
            await projectService.deleteProjects(ids);
            setDraftSelectedIds(new Set());
            setDraftSelectionMode(false);
            fetchDrafts();
            showUndoToast(ids, fetchDrafts);
        } catch (error: any) {
            toast.error(getErrorMessage(error, 'Không thể xoá bản nháp'));
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
                            <h2 className="font-bold text-[13px] uppercase tracking-widest text-black">Workspace dự án</h2>
                            <p className="text-[10px] text-admin-secondary font-bold uppercase tracking-wider">Thiết kế kỹ thuật</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`flex-1 px-4 space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
                    <SidebarItem
                        icon={<Folder size={20} />}
                        label="Tất cả dự án"
                        active={activeTab === 'all'}
                        onClick={() => setActiveTab('all')}
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        icon={<PenTool size={20} />}
                        label="Bản nháp"
                        active={activeTab === 'drafts'}
                        onClick={() => setActiveTab('drafts')}
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="Được chia sẻ với tôi"
                        active={activeTab === 'shared'}
                        onClick={() => setActiveTab('shared')}
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        icon={<LayoutGrid size={20} />}
                        label="Mẫu"
                        active={activeTab === 'templates'}
                        onClick={() => { setActiveTab('templates'); setTemplateKind('knowledge'); }}
                        collapsed={isSidebarCollapsed}
                    />
                    {!isSidebarCollapsed && activeTab === 'templates' && (
                        <div className="ml-8 mt-0.5 border-l-2 border-gray-200 pl-3 space-y-0.5">
                            <SubSidebarItem
                                label="Thư viện UML"
                                active={templateKind === 'knowledge'}
                                onClick={() => setTemplateKind('knowledge')}
                            />
                            <SubSidebarItem
                                label="Mẫu dựng sẵn"
                                active={templateKind === 'sample'}
                                onClick={() => setTemplateKind('sample')}
                            />
                        </div>
                    )}
                    <SidebarItem
                        icon={<Archive size={20} />}
                        label="Lưu trữ"
                        active={activeTab === 'archived'}
                        onClick={() => setActiveTab('archived')}
                        collapsed={isSidebarCollapsed}
                    />
                    <SidebarItem
                        icon={<Trash2 size={20} />}
                        label="Thùng rác"
                        active={activeTab === 'trash'}
                        onClick={() => setActiveTab('trash')}
                        collapsed={isSidebarCollapsed}
                    />
                </nav>

                {/* Bottom Navigation */}
                <div className={`px-4 mt-auto pt-6 border-t border-admin-outline space-y-1 ${isSidebarCollapsed ? 'px-2' : ''}`}>
                    <SidebarItem icon={<PieChart size={18} />} label="Usage" small collapsed={isSidebarCollapsed} onClick={() => setUsageOpen(true)} />
                    <SidebarItem icon={<HelpCircle size={18} />} label="Hỗ trợ" small collapsed={isSidebarCollapsed} />
                    <SidebarItem icon={<CheckCircle2 size={18} />} label="Trạng thái hệ thống" small collapsed={isSidebarCollapsed} />
                </div>
            </aside>

            <UsageModal isOpen={usageOpen} onClose={() => setUsageOpen(false)} />

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
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Mẫu</h1>
                                        <p className="text-lg text-admin-on-surface-variant">
                                            {templateKind === 'knowledge'
                                                ? 'Tìm hiểu từng loại UML diagram — mục đích, thành phần, thời điểm sử dụng và so sánh.'
                                                : 'Các mẫu diagram dựng sẵn gắn với dự án thực tế. Dùng làm điểm khởi đầu.'}
                                        </p>
                                    </>
                                ) : activeTab === 'all' ? (
                                    <>
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Tất cả dự án</h1>
                                        <p className="text-lg text-admin-on-surface-variant">Tạo và quản lý các Workspace thiết kế kiến trúc của bạn.</p>
                                    </>
                                ) : activeTab === 'drafts' ? (
                                    <>
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Bản nháp</h1>
                                        <p className="text-lg text-admin-on-surface-variant">
                                            Các diagram nhanh được lưu dưới dạng bản nháp độc lập. Mở và tiếp tục chỉnh sửa bất cứ lúc nào.
                                        </p>
                                    </>
                                ) : activeTab === 'archived' ? (
                                    <>
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Lưu trữ</h1>
                                        <p className="text-lg text-admin-on-surface-variant">Xem các dự án đã lưu trữ của bạn.</p>
                                    </>
                                ) : activeTab === 'trash' ? (
                                    <>
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Thùng rác</h1>
                                        <p className="text-lg text-admin-on-surface-variant">Các dự án đã xoá có thể được khôi phục tại đây.</p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-4xl font-black tracking-tight text-black mb-2">Được chia sẻ với tôi</h1>
                                        <p className="text-lg text-admin-on-surface-variant">Các dự án được người dùng khác chia sẻ với bạn.</p>
                                    </>
                                )}
                            </div>


                            {/* Grid/List Toggle */}
                            <div className="flex items-center gap-3">
                                {(activeTab === 'all' || activeTab === 'drafts') && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="px-4 py-2 bg-uml-blue text-white font-bold rounded-md text-sm hover:bg-blue-700 transition flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Workspace mới
                                    </button>
                                )}
                                {activeTab === 'trash' && workspaces.length > 0 && (
                                    <button
                                        onClick={() => setShowEmptyTrashConfirm(true)}
                                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-md text-sm hover:bg-red-700 transition flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Dọn sạch thùng rác
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
                                    Tất cả
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
                                        {g === 'structural' ? 'Cấu trúc' : g === 'behavioral' ? 'Hành vi' : 'Mô hình C4'}
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
                                    <h3 className="text-lg font-bold text-gray-400 mb-1">Chưa có mẫu nào</h3>
                                    <p className="text-sm text-gray-300">Các mẫu đang được chuẩn bị.</p>
                                </div>
                            ) : filterLoading ? (
                                <div className="flex items-center justify-center py-20 bg-white border border-admin-outline rounded-sm">
                                    <div className="text-center">
                                        <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">Đang lọc...</p>
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
                                                        <th className="py-4 px-6">Tên mẫu</th>
                                                        <th className="py-4 px-6">Loại</th>
                                                        <th className="py-4 px-6">Danh mục</th>
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
                        ) : activeTab === 'drafts' ? (
                            <section className="mb-12">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-black">
                                        Bản nháp
                                        <span className="ml-2 text-sm font-normal text-gray-400">({drafts.length})</span>
                                    </h2>
                                    <motion.div
                                        layout
                                        transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                                        className={`flex items-center border-2 rounded-full bg-white ${
                                            draftSelectionMode ? 'border-gray-300 px-1.5 py-1' : 'border-gray-300'
                                        }`}
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {draftSelectionMode && (
                                                <motion.div
                                                    key="red-pill-draft"
                                                    initial={{ width: 0, opacity: 0 }}
                                                    animate={{ width: 120, opacity: 1 }}
                                                    exit={{ width: 0, opacity: 0 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                    className="flex items-center overflow-hidden bg-red-600 rounded-full h-8"
                                                >
                                                    <div className="flex items-center h-full shrink-0" style={{ width: 120 }}>
                                                        <button
                                                            onClick={handleDraftDeleteClick}
                                                            disabled={draftSelectedIds.size === 0}
                                                            className={`h-full font-bold text-xs whitespace-nowrap flex-[7] flex items-center justify-center ${draftSelectedIds.size === 0 ? 'text-gray-400' : 'text-white'}`}
                                                        >
                                                            Xoá
                                                        </button>
                                                        <div className="w-[1px] h-5 bg-white/80 shrink-0" />
                                                        <button
                                                            onClick={handleAllDraftsClick}
                                                            className="h-full font-bold text-xs whitespace-nowrap flex-[3] flex items-center justify-center text-white"
                                                        >
                                                            Tất cả
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <button
                                            onClick={() => { setDraftSelectionMode(!draftSelectionMode); if (draftSelectionMode) setDraftSelectedIds(new Set()); }}
                                            className={`flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                                                draftSelectionMode
                                                    ? 'px-3 py-1 text-gray-500 hover:text-gray-700'
                                                    : 'w-9 h-9 text-gray-400 hover:text-red-500 hover:drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                            }`}
                                            title="Xoá bản nháp"
                                        >
                                            {draftSelectionMode ? 'Huỷ' : <Trash2 size={16} />}
                                        </button>
                                    </motion.div>
                                </div>
                                {draftsLoading ? (
                                    <div className="flex items-center justify-center py-20 bg-white border border-admin-outline rounded-sm">
                                        <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : drafts.length === 0 ? (
                                    <div className="text-center py-12 bg-white border border-admin-outline rounded-sm">
                                        <PenTool size={48} className="text-gray-200 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-gray-400 mb-1">Chưa có bản nháp nào</h3>
                                        <p className="text-sm text-gray-300">Tạo diagram từ canvas và lưu dưới dạng bản nháp.</p>
                                    </div>
                                ) : viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {drafts.map((d) => (
                                            <DraftCard
                                                key={d.id}
                                                draft={d}
                                                selectionMode={draftSelectionMode}
                                                selected={draftSelectedIds.has(d.id)}
                                                onToggleSelect={handleToggleDraftSelect}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                            <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                                                <th className="py-4 px-6">Tên bản nháp</th>
                                                <th className="py-4 px-6">Danh mục</th>
                                                <th className="py-4 px-6">Chỉnh sửa lần cuối</th>
                                                <th className="py-4 px-6 text-right">Diagrams</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {drafts.map((d) => (
                                                <DraftListRow
                                                    key={d.id}
                                                    draft={d}
                                                    selectionMode={draftSelectionMode}
                                                    selected={draftSelectedIds.has(d.id)}
                                                    onToggleSelect={handleToggleDraftSelect}
                                                />
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {!draftsLoading && drafts.length > 0 && (
                                    <Pagination page={draftsPage} totalPages={draftsTotalPages} onChange={setDraftsPage} />
                                )}
                            </section>
                        ) : (
                            <>
                                {/* My Workspaces */}
                                <section className="mb-12">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-black">
                                            Workspace của tôi
                                            <span className="ml-2 text-sm font-normal text-gray-400">({workspaces.length})</span>
                                        </h2>
                                        <div className="flex items-center">
                                            <AnimatePresence mode="popLayout">
                                                {selectionMode ? (
                                                    <motion.div
                                                        key="action-bar-floating"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.18 }}
                                                        className="flex items-center gap-2 rounded-xl border border-admin-outline bg-white px-2.5 py-1.5 shadow-md"
                                                    >
                                                        <span className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-lg">
                                                            {selectedIds.size} đã chọn
                                                        </span>

                                                        <button
                                                            onClick={handleAllClick}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            {isAllSelected ? "Bỏ chọn hết" : "Chọn tất cả"}
                                                        </button>

                                                        <div className="h-4 w-[1px] bg-slate-200" />

                                                        {activeTab === 'trash' ? (
                                                            <>
                                                                <button
                                                                    onClick={handleRestoreBulk}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Khôi phục
                                                                </button>
                                                                <button
                                                                    onClick={handlePermanentDeleteBulk}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Xóa vĩnh viễn
                                                                </button>
                                                            </>
                                                        ) : activeTab === 'archived' ? (
                                                            <>
                                                                <button
                                                                    onClick={handleToggleArchiveBulk}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Bỏ lưu trữ
                                                                </button>
                                                                <button
                                                                    onClick={handleDeleteClick}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Xóa tạm
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={handleToggleArchiveBulk}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-uml-blue text-white hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Lưu trữ
                                                                </button>
                                                                <button
                                                                    onClick={handleDeleteClick}
                                                                    disabled={selectedIds.size === 0}
                                                                    className="px-3 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 shadow-sm transition-all whitespace-nowrap"
                                                                >
                                                                    Xóa
                                                                </button>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                                                            title="Thoát chế độ chọn"
                                                        >
                                                            Hủy
                                                        </button>
                                                    </motion.div>
                                                ) : (
                                                    workspaces.length > 0 && (
                                                        <button
                                                            onClick={() => setSelectionMode(true)}
                                                            className="flex h-9 items-center gap-1.5 rounded-xl border border-admin-outline/60 bg-white px-3 text-[12px] font-bold text-admin-secondary transition-all hover:border-uml-blue hover:bg-blue-50/50 hover:text-uml-blue shadow-sm cursor-pointer"
                                                            title="Bật chế độ chọn hàng loạt"
                                                        >
                                                            <Layers size={15} />
                                                            Chọn nhiều
                                                        </button>
                                                    )
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                    {workspacesLoading ? (
                                        <div className="flex items-center justify-center py-20 bg-white border border-admin-outline rounded-sm">
                                            <div className="w-8 h-8 border-2 border-uml-blue border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : workspaces.length === 0 ? (
                                        <div className="text-center py-12 bg-white border border-admin-outline rounded-sm">
                                            {activeTab === 'trash' ? (
                                                <>
                                                    <Trash2 size={48} className="text-gray-200 mx-auto mb-3" />
                                                    <h3 className="text-lg font-bold text-gray-400 mb-1">Thùng rác rỗng</h3>
                                                    <p className="text-sm text-gray-300">Không có dự án nào trong thùng rác.</p>
                                                </>
                                            ) : activeTab === 'archived' ? (
                                                <>
                                                    <Layers size={48} className="text-gray-200 mx-auto mb-3" />
                                                    <h3 className="text-lg font-bold text-gray-400 mb-1">Chưa có dự án lưu trữ</h3>
                                                    <p className="text-sm text-gray-300">Các dự án được lưu trữ sẽ xuất hiện tại đây.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Folder size={48} className="text-gray-200 mx-auto mb-3" />
                                                    <h3 className="text-lg font-bold text-gray-400 mb-1">Chưa có Workspace nào</h3>
                                                    <p className="text-sm text-gray-300 mb-4">Tạo Workspace đầu tiên của bạn để bắt đầu.</p>
                                                    <button
                                                        onClick={() => setShowCreateModal(true)}
                                                        className="px-4 py-2 bg-uml-blue text-white font-bold rounded-md text-sm hover:bg-blue-700 transition"
                                                    >
                                                        Tạo Workspace
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {workspaces.map((ws) => (
                                                <UserWorkspaceCard
                                                    key={ws.id}
                                                    workspace={ws}
                                                    activeTab={activeTab}
                                                    selectionMode={selectionMode}
                                                    selected={selectedIds.has(ws.id)}
                                                    onToggleSelect={handleToggleSelect}
                                                    onRestore={handleRestoreProject}
                                                    onPermanentDelete={handlePermanentDelete}
                                                    onToggleArchive={handleToggleArchive}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-admin-outline rounded-sm overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                <tr className="border-b border-admin-outline bg-gray-50/30 text-[11px] uppercase tracking-wider text-admin-secondary font-bold">
                                                    <th className="py-4 px-6">Tên Workspace</th>
                                                    <th className="py-4 px-6">Danh mục</th>
                                                    <th className="py-4 px-6">Chỉnh sửa lần cuối</th>
                                                    <th className="py-4 px-6 text-right">Diagrams</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {workspaces.map((ws) => (
                                                    <WorkspaceListRow
                                                        key={ws.id}
                                                        workspace={ws}
                                                        activeTab={activeTab}
                                                        selectionMode={selectionMode}
                                                        selected={selectedIds.has(ws.id)}
                                                        onToggleSelect={handleToggleSelect}
                                                        onRestore={handleRestoreProject}
                                                        onPermanentDelete={handlePermanentDelete}
                                                    />
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {!workspacesLoading && workspaces.length > 0 && (
                                        <Pagination page={wsPage} totalPages={wsTotalPages} onChange={setWsPage} />
                                    )}
                                </section>

                                {/* Prebuilt Projects */}
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-black">
                                            Dự án dựng sẵn
                                            <span className="ml-2 text-sm font-normal text-gray-400">({prebuilts.length})</span>
                                        </h2>
                                    </div>
                                    {prebuilts.length === 0 ? (
                                        <div className="text-center py-12 bg-white border border-admin-outline rounded-sm">
                                            <Copy size={48} className="text-gray-200 mx-auto mb-3" />
                                            <h3 className="text-lg font-bold text-gray-400 mb-1">Chưa có dự án dựng sẵn</h3>
                                            <p className="text-sm text-gray-300">Hãy quay lại sau để xem các mẫu dự án dựng sẵn.</p>
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
                            <h3 className="text-lg font-bold text-black mb-2">Xoá dự án?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Bạn có chắc muốn xoá {selectedIds.size} dự án? Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowConfirm(false); setSelectedIds(new Set()); setSelectionMode(false); }}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-md transition"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                                >
                                    Xoá
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDraftConfirm && (
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
                            <h3 className="text-lg font-bold text-black mb-2">Xoá bản nháp?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Bạn có chắc muốn xoá {draftSelectedIds.size} bản nháp? Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowDraftConfirm(false); setDraftSelectedIds(new Set()); setDraftSelectionMode(false); }}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-md transition"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleConfirmDraftDelete}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                                >
                                    Xoá
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Xóa vĩnh viễn 1 dự án — yêu cầu gõ đúng tên để xác nhận */}
            <AnimatePresence>
                {permDeleteTarget && (
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
                            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
                        >
                            <h3 className="text-lg font-bold text-black mb-2">Xóa vĩnh viễn dự án?</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Hành động này <span className="font-bold text-red-600">không thể hoàn tác</span>. Toàn bộ
                                diagram, tài liệu và lịch sử phiên bản của dự án sẽ bị xóa khỏi hệ thống.
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                Gõ đúng tên dự án <span className="font-bold text-black">"{permDeleteTarget.name}"</span> để xác nhận:
                            </p>
                            <input
                                value={permDeleteInput}
                                onChange={(e) => setPermDeleteInput(e.target.value)}
                                placeholder={permDeleteTarget.name}
                                autoFocus
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 mb-6"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setPermDeleteTarget(null); setPermDeleteInput(''); }}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-md transition"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleConfirmPermanentDelete}
                                    disabled={permDeleteInput !== permDeleteTarget.name}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Xóa vĩnh viễn
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dọn sạch thùng rác */}
            <AnimatePresence>
                {showEmptyTrashConfirm && (
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
                            <h3 className="text-lg font-bold text-black mb-2">Dọn sạch thùng rác?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Toàn bộ dự án trong thùng rác sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowEmptyTrashConfirm(false)}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-md transition"
                                >
                                    Huỷ
                                </button>
                                <button
                                    onClick={handleEmptyTrash}
                                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition"
                                >
                                    Dọn sạch
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
                {template.previewImage ? <img src={template.previewImage} alt={`Preview of ${template.name}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />}
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

const DraftCard = ({ draft, selectionMode, selected, onToggleSelect }: { draft: Workspace } & CardActions) => {
    const navigate = useNavigate()
    const sheetId = draft.sheets?.[0]?.id
    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => {
                if (selectionMode) {
                    onToggleSelect(draft.id)
                } else {
                    navigate(`/workspace/${draft.id}?draft=true`)
                }
            }}
            className={`bg-white border rounded flex flex-col group transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden h-[260px] ${
                selected ? 'border-uml-blue ring-2 ring-uml-blue/20' : 'border-admin-outline hover:border-amber-400'
            }`}
        >
            <div className="h-36 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-admin-outline relative overflow-hidden">
                <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute top-3 right-3 flex gap-1.5">
          <span className="px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border bg-amber-100 text-amber-700 border-amber-200">
            Bản nháp
          </span>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1">{draft.name}</h3>
                    <p className="text-[11px] text-admin-secondary font-bold uppercase tracking-widest">{(draft.sheets?.length || 0)} diagram</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <Clock size={12} />
                    {formatRelativeTime(draft.updatedAt)}
                </div>
            </div>
            {selected && (
                <div className="absolute top-3 left-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-uml-blue text-white shadow-md ring-2 ring-white">
                    <CheckCircle2 size={16} />
                </div>
            )}
        </motion.div>
    )
}

const DraftListRow = ({ draft, selectionMode, selected, onToggleSelect }: { draft: Workspace } & CardActions) => {
    const navigate = useNavigate()
    return (
        <tr
            onClick={() => {
                if (selectionMode) {
                    onToggleSelect(draft.id)
                } else {
                    navigate(`/workspace/${draft.id}?draft=true`)
                }
            }}
            className={`relative overflow-hidden border-b transition-colors group cursor-pointer ${
                selected ? 'border-uml-blue bg-blue-50/40' : 'border-admin-outline hover:bg-gray-50/50'
            }`}
        >
            <td className="py-4 px-6">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-uml-blue text-white' : 'bg-amber-100 text-amber-700'}`}>
                        {selected ? <CheckCircle2 size={18} /> : <PenTool size={18} />}
                    </div>
                    <span className="font-bold text-black group-hover:text-uml-blue transition-colors">{draft.name}</span>
                </div>
            </td>
            <td className="py-4 px-6">
        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border bg-amber-100 text-amber-700 border-amber-200">
          Bản nháp
        </span>
            </td>
            <td className="py-4 px-6 text-admin-on-surface-variant font-bold text-[12px] uppercase">{formatRelativeTime(draft.updatedAt)}</td>
            <td className="py-4 px-6 text-right text-[12px] text-admin-secondary font-bold">{(draft.sheets?.length || 0)}</td>
        </tr>
    )
}

interface CardActions {
    selectionMode: boolean
    selected: boolean
    onToggleSelect: (id: string) => void
}

const UserWorkspaceCard = ({
                               workspace,
                               selectionMode,
                               selected,
                               onToggleSelect,
                               activeTab,
                               onRestore,
                               onPermanentDelete,
                               onToggleArchive,
                           }: {
    workspace: Workspace;
    activeTab?: string;
    onRestore?: (id: string) => void;
    onPermanentDelete?: (id: string) => void;
    onToggleArchive?: (id: string) => void;
} & CardActions) => {
    const navigate = useNavigate();
    const isTrash = activeTab === "trash";
    const isArchived = activeTab === "archived";

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => {
                if (selectionMode) {
                    onToggleSelect(workspace.id);
                } else if (!isTrash) {
                    navigate(`/workspace/${workspace.id}`);
                }
            }}
            className={`bg-white border rounded flex flex-col group transition-all relative overflow-hidden h-[260px] ${
                isTrash ? "cursor-default" : "cursor-pointer hover:shadow-xl hover:shadow-blue-500/5"
            } ${
                selected ? 'border-uml-blue ring-2 ring-uml-blue/20' : 'border-admin-outline hover:border-uml-blue'
            }`}
        >
            <div className="h-36 bg-gradient-to-br from-gray-50 to-blue-50 border-b border-admin-outline relative overflow-hidden">
                <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    {isTrash && typeof workspace.daysRemaining === 'number' && (
                        <span
                            className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                workspace.daysRemaining <= 3
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                            title="Số ngày còn lại trước khi bị xóa vĩnh viễn"
                        >
                            Còn {workspace.daysRemaining} ngày
                        </span>
                    )}
                    <span className="px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-sm border bg-uml-blue/10 text-uml-blue border-uml-blue/20">
                        {workspace.category}
                    </span>
                    {onToggleArchive && !isTrash && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleArchive(workspace.id); }}
                            title={isArchived ? "Bỏ lưu trữ" : "Lưu trữ"}
                            className="px-2 py-1 rounded bg-white/90 hover:bg-white border border-admin-outline/30 text-admin-secondary hover:text-uml-blue shadow-sm text-[10px] font-bold"
                        >
                            {isArchived ? "Unarchive" : "Archive"}
                        </button>
                    )}
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-black group-hover:text-uml-blue transition-colors leading-tight mb-1.5">{workspace.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 uppercase tracking-wider text-[10px]">
                            {workspace.totalFiles} {workspace.totalFiles === 1 ? 'FILE' : 'FILES'}
                        </span>
                        {workspace.totalFiles > 0 && (
                            <span className="text-admin-secondary text-[10.5px] font-medium">
                                {[
                                    workspace.diagramCount > 0 ? `${workspace.diagramCount} Diagram${workspace.diagramCount > 1 ? 's' : ''}` : null,
                                    workspace.markdownCount > 0 ? `${workspace.markdownCount} Markdown` : null,
                                ].filter(Boolean).join(" · ")}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 mt-2">
                    <span className="flex items-center gap-1 min-w-0">
                        <Clock size={12} className="shrink-0" />
                        <span className="truncate">
                            {isTrash
                                ? `Đã xóa ${workspace.deletedAt ? formatRelativeTime(workspace.deletedAt) : ''}${workspace.deletedByName ? ` · bởi ${workspace.deletedByName}` : ''}`
                                : formatRelativeTime(workspace.updatedAt)}
                        </span>
                    </span>
                    {isTrash && (
                        <div className="flex items-center gap-1 z-10 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRestore?.(workspace.id); }}
                                className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors text-[10px]"
                            >
                                Khôi phục
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(workspace.id); }}
                                className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-bold hover:bg-red-100 transition-colors text-[10px]"
                            >
                                Xóa vĩnh viễn
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {selected && (
                <div className="absolute top-3 left-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-uml-blue text-white shadow-md ring-2 ring-white">
                    <CheckCircle2 size={16} />
                </div>
            )}
        </motion.div>
    )
}

interface RowActions {
    selectionMode: boolean
    selected: boolean
    onToggleSelect: (id: string) => void
}

const WorkspaceListRow = ({ workspace, activeTab, selectionMode, selected, onToggleSelect, onRestore, onPermanentDelete }: {
    workspace: Workspace;
    activeTab?: string;
    onRestore?: (id: string) => void;
    onPermanentDelete?: (id: string) => void;
} & RowActions) => {
    const navigate = useNavigate()
    const isTrash = activeTab === 'trash'
    return (
        <tr
            onClick={() => {
                if (selectionMode) {
                    onToggleSelect(workspace.id)
                } else if (!isTrash) {
                    navigate(`/workspace/${workspace.id}`)
                }
            }}
            className={`relative overflow-hidden border-b transition-colors group ${isTrash ? 'cursor-default' : 'cursor-pointer'} ${
                selected ? 'border-uml-blue bg-blue-50/40' : 'border-admin-outline hover:bg-gray-50/50'
            }`}
        >
            <td className="py-4 px-6">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-uml-blue text-white' : 'bg-uml-blue/10 text-uml-blue'}`}>
                        {selected ? <CheckCircle2 size={18} /> : <Layers size={18} />}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-black group-hover:text-uml-blue transition-colors">{workspace.name}</span>
                        {isTrash && typeof workspace.daysRemaining === 'number' && (
                            <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-widest border ${
                                workspace.daysRemaining <= 3
                                    ? 'bg-red-100 text-red-700 border-red-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                                Còn {workspace.daysRemaining} ngày
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="py-4 px-6 text-[12px] text-admin-secondary font-bold uppercase">{workspace.category}</td>
            <td className="py-4 px-6 text-admin-on-surface-variant font-bold text-[12px] uppercase">
                {isTrash
                    ? `Đã xóa ${workspace.deletedAt ? formatRelativeTime(workspace.deletedAt) : ''}${workspace.deletedByName ? ` · ${workspace.deletedByName}` : ''}`
                    : formatRelativeTime(workspace.updatedAt)}
            </td>
            <td className="py-4 px-6 text-right text-[12px] text-admin-secondary font-bold">
                {isTrash ? (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRestore?.(workspace.id); }}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors text-[10px]"
                        >
                            Khôi phục
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onPermanentDelete?.(workspace.id); }}
                            className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-bold hover:bg-red-100 transition-colors text-[10px]"
                        >
                            Xóa vĩnh viễn
                        </button>
                    </div>
                ) : (
                    (workspace.sheets?.length || 0)
                )}
            </td>
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
                {meta.coverImage ? <img src={meta.coverImage} alt={`Cover for ${meta.name}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="absolute inset-0 blueprint-grid opacity-30 group-hover:opacity-50 transition-opacity" />}
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
                <h2 className="text-xl font-black text-black mb-2">Tạo Workspace mới</h2>
                <p className="text-sm text-gray-500 mb-6">Workspace chứa các diagram, tài liệu và ngữ cảnh AI cho dự án của bạn.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Tên Workspace</label>
                        <input
                            value={name}
                            onChange={e => onNameChange(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') onCreate() }}
                            placeholder="VD: Nền tảng thương mại điện tử"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Danh mục</label>
                        <select
                            value={category}
                            onChange={e => onCategoryChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-uml-blue focus:ring-1 focus:ring-uml-blue/20 bg-white"
                        >
                            <option value="general">Chung</option>
                            <option value="e-commerce">Thương mại điện tử</option>
                            <option value="healthcare">Y tế</option>
                            <option value="fintech">Công nghệ tài chính</option>
                            <option value="education">Giáo dục</option>
                            <option value="enterprise">Doanh nghiệp</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={onCreate}
                        disabled={!name.trim()}
                        className="px-5 py-2 bg-uml-blue text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        Tạo Workspace
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

export default UserDashboard;
