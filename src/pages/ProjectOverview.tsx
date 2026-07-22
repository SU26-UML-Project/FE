import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronRight, Clock3, FileText, Folder, FolderOpen, Grid2X2, List, Loader2, MoreHorizontal, Plus, Search, Trash2, Workflow, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { projectService } from '../services'
import { workspaceFileService } from '../services/workspaceFileService'
import { ConfirmDialog } from '../components/overlays/ConfirmDialog'
import { getErrorMessage, isInTrashError } from '../shared/lib/errorMessage'
import type { DiagramType } from '../types'
import type { WorkspaceFileItem, WorkspaceFileKind, WorkspaceTreeState } from '../types/workspaceFile'

const diagramTypes: Array<{ id: DiagramType; label: string; hint: string }> = [
  { id: 'usecase', label: 'Use Case', hint: 'Actors and goals' },
  { id: 'class', label: 'Class', hint: 'Domain structure' },
  { id: 'activity', label: 'Activity', hint: 'Process workflow' },
  { id: 'state', label: 'State', hint: 'State transitions' },
  { id: 'component', label: 'Component', hint: 'System modules' },
]

export default function ProjectOverview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<{ name: string; category: string; updatedAt?: string } | null>(null)
  const [tree, setTree] = useState<WorkspaceTreeState>({ items: [], expandedIds: [], activeItemId: null })
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>(() => localStorage.getItem('diauml:overview-view') === 'list' ? 'list' : 'grid')
  const [filter, setFilter] = useState<'all' | WorkspaceFileKind>('all')
  const [query, setQuery] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKind, setCreateKind] = useState<WorkspaceFileKind>('diagram')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [blankMenu, setBlankMenu] = useState<{ x: number; y: number } | null>(null)
  const [action, setAction] = useState<{ mode: 'rename' | 'delete'; item: WorkspaceFileItem } | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [folderHistory, setFolderHistory] = useState<Array<string | null>>([null])
  const [historyIndex, setHistoryIndex] = useState(0)
  // Dự án đang trong thùng rác (BE trả code 1805) → yêu cầu khôi phục trước khi xem
  const [trashPrompt, setTrashPrompt] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      // Cây file giờ là dữ liệu server (workspace-items API) — không còn dựng từ sheets + localStorage
      const [projectRes, treeState] = await Promise.all([projectService.getProjectById(id), workspaceFileService.fetchTree(id)])
      setProject({ name: projectRes.result.projectName, category: projectRes.result.description || 'general', updatedAt: projectRes.result.updatedAt })
      setTree(treeState)
    } catch (error) {
      // Đã xóa mềm: không đá về dashboard mà mở popup cho phép khôi phục ngay.
      if (isInTrashError(error)) {
        setTrashPrompt(true)
        return
      }
      toast.error(getErrorMessage(error, 'Không thể tải dự án'))
      navigate('/dashboard')
    } finally { setLoading(false) }
  }, [id, navigate])

  const handleRestoreAndOpen = useCallback(async () => {
    if (!id || restoring) return
    setRestoring(true)
    try {
      await projectService.restoreProject(id)
      toast.success('Khôi phục dự án thành công')
      setTrashPrompt(false)
      refresh()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể khôi phục dự án'))
    } finally { setRestoring(false) }
  }, [id, refresh, restoring])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { localStorage.setItem('diauml:overview-view', view) }, [view])
  useEffect(() => {
    if (!menuId && !blankMenu) return
    const closeMenus = () => { setMenuId(null); setBlankMenu(null) }
    window.addEventListener('pointerdown', closeMenus)
    window.addEventListener('blur', closeMenus)
    return () => { window.removeEventListener('pointerdown', closeMenus); window.removeEventListener('blur', closeMenus) }
  }, [menuId, blankMenu])

  const currentItems = useMemo(() => tree.items.filter(item => item.parentId === folderId && (filter === 'all' || item.kind === filter) && item.name.toLowerCase().includes(query.trim().toLowerCase())), [tree.items, folderId, filter, query])
  const recent = useMemo(() => tree.items.filter(item => item.kind !== 'folder').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3), [tree.items])
  const counts = useMemo(() => ({ diagram: tree.items.filter(x => x.kind === 'diagram').length, markdown: tree.items.filter(x => x.kind === 'markdown').length, folder: tree.items.filter(x => x.kind === 'folder').length }), [tree.items])
  const breadcrumbs = useMemo(() => { const result: WorkspaceFileItem[] = []; let cursor = folderId; while (cursor) { const item = tree.items.find(x => x.id === cursor); if (!item) break; result.unshift(item); cursor = item.parentId } return result }, [folderId, tree.items])

  const navigateFolder = (nextId: string | null) => {
    if (nextId === folderId) return
    const nextHistory = [...folderHistory.slice(0, historyIndex + 1), nextId]
    setFolderHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
    setFolderId(nextId)
    setSelectedIds(new Set())
  }
  const historyBack = () => {
    if (historyIndex <= 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    setFolderId(folderHistory[nextIndex])
    setSelectedIds(new Set())
  }
  const historyForward = () => {
    if (historyIndex >= folderHistory.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setFolderId(folderHistory[nextIndex])
    setSelectedIds(new Set())
  }
  const toggleSelected = (itemId: string) => setSelectedIds(previous => {
    const next = new Set(previous)
    next.has(itemId) ? next.delete(itemId) : next.add(itemId)
    return next
  })
  const openItem = (item: WorkspaceFileItem) => {
    if (selectionMode) { toggleSelected(item.id); return }
    if (item.kind === 'folder') { navigateFolder(item.id); return }
    workspaceFileService.saveState(id!, { activeItemId: item.id })
    navigate(`/workspace/${id}/editor/${encodeURIComponent(item.id)}`)
  }
  const showCreate = (kind: WorkspaceFileKind = 'diagram') => { setCreateKind(kind); setCreateOpen(true); setBlankMenu(null) }
  const openWorkspace = () => {
    const item = tree.items.find(x => x.id === tree.activeItemId && x.kind !== 'folder') || recent[0]
    if (item) openItem(item); else navigate(`/workspace/${id}/editor`)
  }
  const rename = (item: WorkspaceFileItem) => { setAction({ mode: 'rename', item }); setMenuId(null) }
  const remove = (item: WorkspaceFileItem) => { setAction({ mode: 'delete', item }); setMenuId(null) }


  if (loading) return <div className="flex min-h-screen items-center justify-center bg-admin-bg"><Loader2 className="animate-spin text-uml-blue"/></div>
  if (trashPrompt) return (
    <ConfirmDialog
      title="Dự án đang trong thùng rác"
      message='Bạn cần khôi phục dự án này trước khi mở. Khôi phục sẽ đưa dự án về mục "Tất cả dự án".'
      confirmLabel={restoring ? 'Đang khôi phục…' : 'Khôi phục'}
      cancelLabel="Về trang chủ"
      danger={false}
      onConfirm={handleRestoreAndOpen}
      onCancel={() => navigate('/dashboard')}
    />
  )
  if (!project) return null

  return <div
    className="min-h-screen overflow-auto bg-admin-bg/40 px-5 pb-16 pt-28 text-admin-on-surface sm:px-8 lg:px-12"
    onContextMenu={event => {
      if (selectionMode || (event.target as HTMLElement).closest('[data-overview-item], button, input, [role="dialog"]')) return
      event.preventDefault()
      setMenuId(null)
      setBlankMenu({ x: event.clientX, y: event.clientY })
    }}
  >
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => navigate('/dashboard')} className="flex h-9 items-center gap-2 rounded-lg border border-admin-outline bg-white px-3 text-xs font-bold text-admin-secondary shadow-sm transition hover:border-uml-blue hover:text-uml-blue"><ArrowLeft size={15}/> All Projects</button>
        <div className="flex h-9 items-center rounded-lg border border-admin-outline bg-white p-1 shadow-sm">
          <button disabled={historyIndex <= 0} onClick={historyBack} className="rounded-md p-1.5 text-admin-secondary transition hover:bg-admin-bg hover:text-uml-blue disabled:cursor-not-allowed disabled:opacity-30" title="Previous folder"><ArrowLeft size={15}/></button>
          <button disabled={historyIndex >= folderHistory.length - 1} onClick={historyForward} className="rounded-md p-1.5 text-admin-secondary transition hover:bg-admin-bg hover:text-uml-blue disabled:cursor-not-allowed disabled:opacity-30" title="Next folder"><ArrowRight size={15}/></button>
        </div>
      </div>
      <section className="flex flex-col gap-5 border-b border-admin-outline pb-6 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-uml-blue/15 bg-uml-blue/10 text-uml-blue"><FolderOpen size={24}/></div><div className="min-w-0"><h1 className="truncate text-2xl font-black tracking-tight">{project.name}</h1><p className="mt-1 text-xs font-medium text-admin-secondary">{project.category} · {counts.diagram} diagrams · {counts.markdown} documents</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><button onClick={() => showCreate()} className="flex h-10 items-center gap-2 rounded-lg bg-uml-blue px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"><Plus size={16}/> New item</button><button onClick={openWorkspace} className="h-10 rounded-lg border border-admin-outline bg-white px-4 text-xs font-bold transition hover:border-uml-blue hover:text-uml-blue">Open workspace</button><button onClick={() => { setSelectionMode(value => !value); setSelectedIds(new Set()) }} className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${selectionMode ? 'border-red-300 bg-red-50 text-red-600' : 'border-admin-outline bg-white text-admin-secondary hover:border-red-300 hover:text-red-600'}`} title={selectionMode ? 'Cancel selection' : 'Select items to delete'}><Trash2 size={16}/></button><div className="flex h-10 rounded-lg border border-admin-outline bg-white p-1"><button onClick={() => setView('grid')} className={`rounded-md px-2 ${view === 'grid' ? 'bg-uml-blue text-white' : 'text-admin-secondary'}`}><Grid2X2 size={15}/></button><button onClick={() => setView('list')} className={`rounded-md px-2 ${view === 'list' ? 'bg-uml-blue text-white' : 'text-admin-secondary'}`}><List size={16}/></button></div></div>
      </section>

      {!selectionMode && !folderId && recent.length > 0 && <section className="mt-7"><div className="mb-3 flex items-center gap-2"><h2 className="text-sm font-black">Recent</h2><span className="text-[10px] font-bold text-admin-secondary">{recent.length}</span></div><div className="grid gap-3 md:grid-cols-3">{recent.map(item => <button key={item.id} onClick={() => openItem(item)} className="group flex items-center gap-3 rounded-xl border border-admin-outline bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-uml-blue hover:shadow-md"><ItemIcon item={item}/><span className="min-w-0 flex-1"><b className="block truncate text-sm group-hover:text-uml-blue">{item.name}</b><small className="mt-1 block text-[10px] uppercase tracking-wider text-admin-secondary">{item.kind} · recently edited</small></span><ChevronRight size={16} className="text-admin-outline"/></button>)}</div></section>}

      <section className="mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-1 text-sm font-black"><button onClick={() => navigateFolder(null)} className="hover:text-uml-blue">Project files</button>{breadcrumbs.map(item => <span key={item.id} className="flex items-center gap-1"><ChevronRight size={13} className="text-admin-outline"/><button onClick={() => navigateFolder(item.id)} className="hover:text-uml-blue">{item.name}</button></span>)}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-admin-secondary"><span>{currentItems.length} items in this location</span><span className="h-1 w-1 rounded-full bg-admin-outline"/><span>Right-click empty space to create</span></div></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-admin-secondary"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this folder…" className="h-9 w-56 rounded-lg border border-admin-outline bg-white pl-9 pr-8 text-xs outline-none focus:border-uml-blue"/>{query && <button onClick={() => setQuery('')} className="absolute right-2 top-2.5"><X size={14}/></button>}</div><div className="flex gap-1 rounded-lg border border-admin-outline bg-white p-1">{(['all','diagram','markdown','folder'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold capitalize ${filter === value ? 'bg-uml-blue/10 text-uml-blue' : 'text-admin-secondary hover:bg-admin-bg'}`}>{value}</button>)}</div></div></div>

        {selectionMode && <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3"><div><b className="text-sm text-red-900">{selectedIds.size} selected</b><p className="mt-0.5 text-[10px] text-red-700">Choose items, then confirm deletion.</p></div><div className="flex gap-2"><button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">Cancel</button><button disabled={!selectedIds.size} onClick={() => setBulkDeleteOpen(true)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><Trash2 size={14} className="mr-1 inline"/>Delete selected</button></div></div>}
        <div className="relative mt-4 min-h-[360px] rounded-xl border border-dashed border-admin-outline/80 bg-white/20 p-3 transition-colors hover:border-uml-blue/35">
          <div className="pointer-events-none absolute bottom-3 right-4 rounded-md border border-admin-outline/60 bg-white/80 px-2 py-1 text-[9px] font-bold text-admin-secondary/70 backdrop-blur">Right-click empty space</div>
        {currentItems.length ? view === 'grid' ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{!selectionMode && <button onClick={() => showCreate()} className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-admin-outline bg-white/50 text-admin-secondary transition hover:border-uml-blue hover:bg-white hover:text-uml-blue"><Plus size={22}/><span className="mt-2 text-xs font-bold">Add item</span></button>}{currentItems.map(item => <ItemCard key={item.id} item={item} selected={selectedIds.has(item.id)} selectionMode={selectionMode} menuOpen={menuId === item.id} onOpen={() => openItem(item)} onMenu={() => setMenuId(menuId === item.id ? null : item.id)} onRename={() => rename(item)} onDelete={() => remove(item)}/>)}</div> : <div className="mt-4 overflow-hidden rounded-xl border border-admin-outline bg-white">{currentItems.map(item => <ItemRow key={item.id} item={item} selected={selectedIds.has(item.id)} selectionMode={selectionMode} onOpen={() => openItem(item)} onRename={() => rename(item)} onDelete={() => remove(item)}/>)}</div> : <div className="mt-4 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-admin-outline bg-white/50 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-uml-blue/10 text-uml-blue"><Folder size={26}/></div><h3 className="mt-4 text-base font-bold">{query || filter !== 'all' ? 'No matching items' : 'This folder is empty'}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-admin-secondary">Create a diagram, Markdown document, or folder to organize this project.</p><button onClick={() => showCreate()} className="mt-4 rounded-lg bg-uml-blue px-4 py-2 text-xs font-bold text-white">Create item</button></div>}
        </div>
      </section>
    </div>
    {blankMenu && <div onPointerDown={event => event.stopPropagation()} className="fixed z-[160] w-48 rounded-lg border border-admin-outline bg-white p-1.5 shadow-[0_16px_50px_rgba(15,23,42,.18)]" style={{ left: Math.min(blankMenu.x, window.innerWidth - 205), top: Math.min(blankMenu.y, window.innerHeight - 180) }}><p className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-admin-secondary">Create in this folder</p><button onClick={() => showCreate('markdown')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-admin-bg"><FileText size={14}/> New Markdown</button><button onClick={() => showCreate('diagram')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-admin-bg"><Workflow size={14}/> New Diagram</button><button onClick={() => showCreate('folder')} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-admin-bg"><Folder size={14}/> New Folder</button></div>}
    {createOpen && <CreateModal initialKind={createKind} projectId={id!} parentId={folderId} items={tree.items} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refresh() }}/>}
    {action && <ActionModal projectId={id!} action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); refresh() }}/>}
    {bulkDeleteOpen && <BulkDeleteModal projectId={id!} items={tree.items} selectedIds={selectedIds} onClose={() => setBulkDeleteOpen(false)} onDone={() => { setBulkDeleteOpen(false); setSelectionMode(false); setSelectedIds(new Set()); refresh() }}/>} 
  </div>
}

function ItemIcon({ item }: { item: WorkspaceFileItem }) { return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.kind === 'folder' ? 'bg-amber-50 text-amber-600' : item.kind === 'markdown' ? 'bg-violet-50 text-violet-600' : 'bg-uml-blue/10 text-uml-blue'}`}>{item.kind === 'folder' ? <Folder size={19}/> : item.kind === 'markdown' ? <FileText size={19}/> : <Workflow size={19}/>}</div> }
function ItemCard({ item, selected, selectionMode, menuOpen, onOpen, onMenu, onRename, onDelete }: { item: WorkspaceFileItem; selected: boolean; selectionMode: boolean; menuOpen: boolean; onOpen: () => void; onMenu: () => void; onRename: () => void; onDelete: () => void }) {
  const delayed = useDelayedOpen(onOpen, onRename)
  return <motion.article data-overview-item whileHover={{ y: -3 }} onClick={onOpen} className={`group relative min-h-48 cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-lg ${selected ? 'border-red-400 ring-2 ring-red-200' : 'border-admin-outline hover:border-uml-blue'}`}>
    <div className="flex h-28 items-center justify-center border-b border-admin-outline bg-gradient-to-br from-white to-admin-bg"><ItemIcon item={item}/><span className="absolute right-3 top-3 rounded border border-admin-outline bg-white px-2 py-1 text-[8px] font-black uppercase tracking-widest text-admin-secondary">{item.kind}</span></div>
    <div className="p-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 onClick={delayed.click} onDoubleClick={delayed.doubleClick} className="truncate text-sm font-bold group-hover:text-uml-blue" title="Double-click to rename">{item.name}</h3><p className="mt-1 text-[10px] capitalize text-admin-secondary">{item.kind === 'diagram' ? `${item.diagramType || 'UML'} diagram` : item.kind === 'markdown' ? 'Project documentation' : 'Project folder'}</p></div>{!selectionMode && <button onClick={event => { event.stopPropagation(); onMenu() }} className="rounded p-1 text-admin-secondary hover:bg-admin-bg"><MoreHorizontal size={16}/></button>}</div><div className="mt-5 flex items-center gap-1 text-[9px] text-admin-secondary"><Clock3 size={11}/> Updated recently</div></div>
    {selectionMode && <div className={`absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-red-500 bg-red-500 text-white' : 'border-admin-outline bg-white'}`}>{selected && '✓'}</div>}
    {menuOpen && !selectionMode && <div onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} className="absolute right-3 top-10 z-20 w-32 rounded-lg border border-admin-outline bg-white p-1 shadow-xl"><button onClick={onRename} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-admin-bg">Rename</button><button onClick={onDelete} className="block w-full rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50">Delete</button></div>}
  </motion.article>
}

function ItemRow({ item, selected, selectionMode, onOpen, onRename, onDelete }: { item: WorkspaceFileItem; selected: boolean; selectionMode: boolean; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const delayed = useDelayedOpen(onOpen, onRename)
  return <div data-overview-item className={`group flex items-center gap-3 border-b px-4 py-3 last:border-0 ${selected ? 'border-red-200 bg-red-50' : 'border-admin-outline hover:bg-admin-bg'}`}>
    {selectionMode && <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] ${selected ? 'border-red-500 bg-red-500 text-white' : 'border-admin-outline bg-white'}`}>{selected && '✓'}</span>}
    <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left"><ItemIcon item={item}/><span className="min-w-0"><b onClick={delayed.click} onDoubleClick={delayed.doubleClick} className="block truncate text-sm group-hover:text-uml-blue" title="Double-click to rename">{item.name}</b><small className="text-[10px] capitalize text-admin-secondary">{item.kind}{item.diagramType ? ` · ${item.diagramType}` : ''}</small></span></button>
    {!selectionMode && <><button onClick={onRename} className="rounded px-2 py-1 text-[10px] font-bold text-admin-secondary hover:bg-white">Rename</button><button onClick={onDelete} className="rounded px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50">Delete</button></>}
  </div>
}

function useDelayedOpen(onOpen: () => void, onRename: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return {
    click: (event: React.MouseEvent) => { event.stopPropagation(); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(onOpen, 220) },
    doubleClick: (event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); if (timer.current) clearTimeout(timer.current); timer.current = null; onRename() },
  }
}

function CreateModal({ initialKind, projectId, parentId, items, onClose, onCreated }: { initialKind: WorkspaceFileKind; projectId: string; parentId: string | null; items: WorkspaceFileItem[]; onClose: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<WorkspaceFileKind>(initialKind); const [name, setName] = useState(''); const [type, setType] = useState<DiagramType>('activity'); const [busy, setBusy] = useState(false)
  const normalized = kind === 'markdown' ? `${name.trim().replace(/(?:\.md)+$/i, '')}.md` : name.trim(); const duplicate = items.some(x => x.parentId === parentId && x.name.toLowerCase() === normalized.toLowerCase())
  const submit = async () => { if (!normalized || duplicate || busy) return; setBusy(true); try { await workspaceFileService.create(projectId, { name: normalized, kind, parentId, content: kind === 'markdown' ? '' : undefined, diagramType: kind === 'diagram' ? type : undefined, diagramData: kind === 'diagram' ? JSON.stringify({ nodes: [], edges: [], diagramType: type, viewport: { x: 0, y: 0, zoom: 1 } }) : undefined }); toast.success(`${kind} created`); onCreated() } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create item') } finally { setBusy(false) } }
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="w-full max-w-xl overflow-hidden rounded-xl border border-admin-outline bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-admin-outline p-5"><div><h2 className="text-lg font-bold">Create new item</h2><p className="mt-1 text-xs text-admin-secondary">Add content to your project workspace.</p></div><button onClick={onClose}><X size={18}/></button></header><div className="max-h-[65vh] overflow-auto p-5"><div className="grid grid-cols-3 gap-2">{(['diagram','markdown','folder'] as WorkspaceFileKind[]).map(value => <button key={value} onClick={() => setKind(value)} className={`rounded-lg border p-3 text-left ${kind === value ? 'border-uml-blue bg-uml-blue/5 ring-1 ring-uml-blue' : 'border-admin-outline hover:bg-admin-bg'}`}><b className="text-xs capitalize">{value}</b><small className="mt-1 block text-[10px] text-admin-secondary">{value === 'diagram' ? 'Visual model' : value === 'markdown' ? 'Documentation' : 'Organize files'}</small></button>)}</div><label className="mb-2 mt-5 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} className={`h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-uml-blue/10 ${duplicate ? 'border-red-400' : 'border-admin-outline focus:border-uml-blue'}`} placeholder={kind === 'diagram' ? 'Authentication flow' : kind === 'markdown' ? 'requirements.md' : 'Architecture'}/>{duplicate && <p className="mt-1 text-[11px] text-red-600">This name already exists in the current folder.</p>}{kind === 'diagram' && <><label className="mb-2 mt-5 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Diagram type</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{diagramTypes.map(option => <button key={option.id} onClick={() => setType(option.id)} className={`rounded-lg border p-3 text-left ${type === option.id ? 'border-uml-blue bg-uml-blue/5 ring-1 ring-uml-blue' : 'border-admin-outline hover:bg-admin-bg'}`}><b className="text-xs">{option.label}</b><small className="mt-1 block text-[10px] text-admin-secondary">{option.hint}</small></button>)}</div></>}</div><footer className="flex justify-end gap-2 border-t border-admin-outline bg-admin-bg/50 p-4"><button onClick={onClose} className="rounded-lg border border-admin-outline bg-white px-4 py-2 text-xs font-bold">Cancel</button><button disabled={!normalized || duplicate || busy} onClick={submit} className="rounded-lg bg-uml-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Creating…' : `Create ${kind}`}</button></footer></div></div>
}

function ActionModal({ projectId, action, onClose, onDone }: { projectId: string; action: { mode: 'rename' | 'delete'; item: WorkspaceFileItem }; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(action.item.name)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (busy || (action.mode === 'rename' && !name.trim())) return
    setBusy(true)
    try {
      if (action.mode === 'rename') {
        // Backend tự sync tên sheet cho diagram — không cần gọi sheet API riêng
        await workspaceFileService.update(projectId, action.item.id, { name: name.trim() })
      } else {
        // Server xóa đệ quy subtree + sheet liên kết trong 1 transaction
        await workspaceFileService.remove(projectId, [action.item.id], true)
      }
      toast.success(action.mode === 'rename' ? 'Item renamed' : 'Item deleted')
      onDone()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Action failed') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="w-full max-w-md overflow-hidden rounded-xl border border-admin-outline bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-admin-outline p-5"><div><h2 className="text-lg font-bold">{action.mode === 'rename' ? 'Rename item' : 'Delete item?'}</h2><p className="mt-1 text-xs text-admin-secondary">{action.mode === 'rename' ? 'Choose a clear name for this project item.' : 'This action cannot be undone in the current prototype.'}</p></div><button onClick={onClose}><X size={18}/></button></header><div className="p-5">{action.mode === 'rename' ? <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Name</label><input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} className="h-10 w-full rounded-lg border border-admin-outline px-3 text-sm outline-none focus:border-uml-blue focus:ring-2 focus:ring-uml-blue/10"/></> : <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">Delete “{action.item.name}”?</p><p className="mt-1 text-xs leading-5 text-red-700">{action.item.kind === 'folder' ? 'Everything inside this folder will also be removed. ' : ''}Diagram deletion also removes its backend sheet.</p></div>}</div><footer className="flex justify-end gap-2 border-t border-admin-outline bg-admin-bg/50 p-4"><button onClick={onClose} className="rounded-lg border border-admin-outline bg-white px-4 py-2 text-xs font-bold">Cancel</button><button disabled={busy || (action.mode === 'rename' && !name.trim())} onClick={submit} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${action.mode === 'delete' ? 'bg-red-600' : 'bg-uml-blue'}`}>{busy ? 'Working…' : action.mode === 'rename' ? 'Save changes' : 'Delete'}</button></footer></div></div>
}

function BulkDeleteModal({ projectId, items, selectedIds, onClose, onDone }: { projectId: string; items: WorkspaceFileItem[]; selectedIds: Set<string>; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const roots = items.filter(item => selectedIds.has(item.id) && !item.parentId || selectedIds.has(item.id) && !selectedIds.has(item.parentId || ''))
  const remove = async () => {
    setBusy(true)
    try {
      // 1 request bulk — server xóa đệ quy con cháu + sheet liên kết atomic
      await workspaceFileService.remove(projectId, roots.map(root => root.id), true)
      toast.success(`${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'} deleted`)
      onDone()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete selected items') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="w-full max-w-md overflow-hidden rounded-xl border border-admin-outline bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-admin-outline p-5"><div><h2 className="text-lg font-bold">Delete selected items?</h2><p className="mt-1 text-xs text-admin-secondary">{selectedIds.size} selected · nested contents are included automatically.</p></div><button onClick={onClose}><X size={18}/></button></header><div className="p-5"><div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">This action cannot be undone.</p><p className="mt-1 text-xs leading-5 text-red-700">Linked diagram sheets will also be deleted from the current backend.</p></div></div><footer className="flex justify-end gap-2 border-t border-admin-outline bg-admin-bg/50 p-4"><button onClick={onClose} className="rounded-lg border border-admin-outline bg-white px-4 py-2 text-xs font-bold">Cancel</button><button disabled={busy} onClick={remove} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{busy ? 'Deleting…' : `Delete ${selectedIds.size} items`}</button></footer></div></div>
}
