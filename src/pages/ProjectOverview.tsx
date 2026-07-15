import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Clock3, FileText, Folder, FolderOpen, Grid2X2, List, Loader2, MoreHorizontal, Plus, Search, Workflow, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { projectService, sheetService } from '../services'
import { workspaceFileService } from '../services/workspaceFileService'
import type { DiagramType } from '../types'
import type { WorkspaceFileItem, WorkspaceFileKind, WorkspaceTreeState } from '../types/workspaceFile'

const diagramTypes: Array<{ id: DiagramType; label: string; hint: string }> = [
  { id: 'usecase', label: 'Use Case', hint: 'Actors and goals' }, { id: 'class', label: 'Class', hint: 'Domain structure' },
  { id: 'sequence', label: 'Sequence', hint: 'Message flow' }, { id: 'activity', label: 'Activity', hint: 'Process workflow' },
  { id: 'state', label: 'State', hint: 'State transitions' }, { id: 'component', label: 'Component', hint: 'System modules' },
  { id: 'deployment', label: 'Deployment', hint: 'Runtime topology' },
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
  const [menuId, setMenuId] = useState<string | null>(null)
  const [action, setAction] = useState<{ mode: 'rename' | 'delete'; item: WorkspaceFileItem } | null>(null)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [projectRes, sheetsRes] = await Promise.all([projectService.getProjectById(id), sheetService.getSheetsByProject(id)])
      setProject({ name: projectRes.result.projectName, category: projectRes.result.description || 'general', updatedAt: projectRes.result.updatedAt })
      const sheets = (sheetsRes.result || []).map(sheet => {
        let type: DiagramType = 'activity'
        try { type = JSON.parse(sheet.diagramData)?.diagramType || 'activity' } catch { /* keep fallback */ }
        return { id: sheet.id, name: sheet.name, diagramType: type }
      })
      setTree(workspaceFileService.syncDiagrams(id, sheets))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load project')
      navigate('/dashboard')
    } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { localStorage.setItem('diauml:overview-view', view) }, [view])

  const currentItems = useMemo(() => tree.items.filter(item => item.parentId === folderId && (filter === 'all' || item.kind === filter) && item.name.toLowerCase().includes(query.trim().toLowerCase())), [tree.items, folderId, filter, query])
  const recent = useMemo(() => tree.items.filter(item => item.kind !== 'folder').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3), [tree.items])
  const counts = useMemo(() => ({ diagram: tree.items.filter(x => x.kind === 'diagram').length, markdown: tree.items.filter(x => x.kind === 'markdown').length, folder: tree.items.filter(x => x.kind === 'folder').length }), [tree.items])
  const breadcrumbs = useMemo(() => { const result: WorkspaceFileItem[] = []; let cursor = folderId; while (cursor) { const item = tree.items.find(x => x.id === cursor); if (!item) break; result.unshift(item); cursor = item.parentId } return result }, [folderId, tree.items])

  const openItem = (item: WorkspaceFileItem) => {
    if (item.kind === 'folder') { setFolderId(item.id); return }
    workspaceFileService.saveState(id!, { activeItemId: item.id })
    navigate(`/workspace/${id}/editor/${encodeURIComponent(item.id)}`)
  }
  const openWorkspace = () => {
    const item = tree.items.find(x => x.id === tree.activeItemId && x.kind !== 'folder') || recent[0]
    if (item) openItem(item); else setCreateOpen(true)
  }
  const rename = (item: WorkspaceFileItem) => { setAction({ mode: 'rename', item }); setMenuId(null) }
  const remove = (item: WorkspaceFileItem) => { setAction({ mode: 'delete', item }); setMenuId(null) }


  if (loading) return <div className="flex min-h-screen items-center justify-center bg-admin-bg"><Loader2 className="animate-spin text-uml-blue"/></div>
  if (!project) return null

  return <div className="min-h-screen overflow-auto bg-admin-bg/40 px-5 pb-16 pt-8 text-admin-on-surface sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <button onClick={() => navigate('/dashboard')} className="mb-6 flex items-center gap-1 text-xs font-bold text-admin-secondary transition hover:text-uml-blue">‹ All Projects</button>
      <section className="flex flex-col gap-5 border-b border-admin-outline pb-6 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-uml-blue/15 bg-uml-blue/10 text-uml-blue"><FolderOpen size={24}/></div><div className="min-w-0"><h1 className="truncate text-2xl font-black tracking-tight">{project.name}</h1><p className="mt-1 text-xs font-medium text-admin-secondary">{project.category} · {counts.diagram} diagrams · {counts.markdown} documents</p></div></div>
        <div className="flex items-center gap-2"><button onClick={() => setCreateOpen(true)} className="flex h-10 items-center gap-2 rounded-lg bg-uml-blue px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"><Plus size={16}/> New item</button><button onClick={openWorkspace} className="h-10 rounded-lg border border-admin-outline bg-white px-4 text-xs font-bold transition hover:border-uml-blue hover:text-uml-blue">Open workspace</button><div className="flex h-10 rounded-lg border border-admin-outline bg-white p-1"><button onClick={() => setView('grid')} className={`rounded-md px-2 ${view === 'grid' ? 'bg-uml-blue text-white' : 'text-admin-secondary'}`}><Grid2X2 size={15}/></button><button onClick={() => setView('list')} className={`rounded-md px-2 ${view === 'list' ? 'bg-uml-blue text-white' : 'text-admin-secondary'}`}><List size={16}/></button></div></div>
      </section>

      {!folderId && recent.length > 0 && <section className="mt-7"><div className="mb-3 flex items-center gap-2"><h2 className="text-sm font-black">Recent</h2><span className="text-[10px] font-bold text-admin-secondary">{recent.length}</span></div><div className="grid gap-3 md:grid-cols-3">{recent.map(item => <button key={item.id} onClick={() => openItem(item)} className="group flex items-center gap-3 rounded-xl border border-admin-outline bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-uml-blue hover:shadow-md"><ItemIcon item={item}/><span className="min-w-0 flex-1"><b className="block truncate text-sm group-hover:text-uml-blue">{item.name}</b><small className="mt-1 block text-[10px] uppercase tracking-wider text-admin-secondary">{item.kind} · recently edited</small></span><ChevronRight size={16} className="text-admin-outline"/></button>)}</div></section>}

      <section className="mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-1 text-sm font-black"><button onClick={() => setFolderId(null)} className="hover:text-uml-blue">Project files</button>{breadcrumbs.map(item => <span key={item.id} className="flex items-center gap-1"><ChevronRight size={13} className="text-admin-outline"/><button onClick={() => setFolderId(item.id)} className="hover:text-uml-blue">{item.name}</button></span>)}</div><p className="mt-1 text-[11px] text-admin-secondary">{currentItems.length} items in this location</p></div><div className="flex flex-wrap items-center gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-admin-secondary"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search this folder…" className="h-9 w-56 rounded-lg border border-admin-outline bg-white pl-9 pr-8 text-xs outline-none focus:border-uml-blue"/>{query && <button onClick={() => setQuery('')} className="absolute right-2 top-2.5"><X size={14}/></button>}</div><div className="flex gap-1 rounded-lg border border-admin-outline bg-white p-1">{(['all','diagram','markdown','folder'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold capitalize ${filter === value ? 'bg-uml-blue/10 text-uml-blue' : 'text-admin-secondary hover:bg-admin-bg'}`}>{value}</button>)}</div></div></div>

        {currentItems.length ? view === 'grid' ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><button onClick={() => setCreateOpen(true)} className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-admin-outline bg-white/50 text-admin-secondary transition hover:border-uml-blue hover:bg-white hover:text-uml-blue"><Plus size={22}/><span className="mt-2 text-xs font-bold">Add item</span></button>{currentItems.map(item => <ItemCard key={item.id} item={item} menuOpen={menuId === item.id} onOpen={() => openItem(item)} onMenu={() => setMenuId(menuId === item.id ? null : item.id)} onRename={() => rename(item)} onDelete={() => remove(item)}/>)}</div> : <div className="mt-4 overflow-hidden rounded-xl border border-admin-outline bg-white">{currentItems.map(item => <ItemRow key={item.id} item={item} onOpen={() => openItem(item)} onRename={() => rename(item)} onDelete={() => remove(item)}/>)}</div> : <div className="mt-4 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-admin-outline bg-white/50 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-uml-blue/10 text-uml-blue"><Folder size={26}/></div><h3 className="mt-4 text-base font-bold">{query || filter !== 'all' ? 'No matching items' : 'This folder is empty'}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-admin-secondary">Create a diagram, Markdown document, or folder to organize this project.</p><button onClick={() => setCreateOpen(true)} className="mt-4 rounded-lg bg-uml-blue px-4 py-2 text-xs font-bold text-white">Create item</button></div>}
      </section>
    </div>
    {createOpen && <CreateModal projectId={id!} parentId={folderId} items={tree.items} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setTree(workspaceFileService.load(id!)); refresh() }}/>} 
    {action && <ActionModal projectId={id!} action={action} onClose={() => setAction(null)} onDone={() => { setAction(null); setTree(workspaceFileService.load(id!)); refresh() }}/>} 
  </div>
}

function ItemIcon({ item }: { item: WorkspaceFileItem }) { return <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.kind === 'folder' ? 'bg-amber-50 text-amber-600' : item.kind === 'markdown' ? 'bg-violet-50 text-violet-600' : 'bg-uml-blue/10 text-uml-blue'}`}>{item.kind === 'folder' ? <Folder size={19}/> : item.kind === 'markdown' ? <FileText size={19}/> : <Workflow size={19}/>}</div> }
function ItemCard({ item, menuOpen, onOpen, onMenu, onRename, onDelete }: { item: WorkspaceFileItem; menuOpen: boolean; onOpen: () => void; onMenu: () => void; onRename: () => void; onDelete: () => void }) { return <motion.article whileHover={{ y: -3 }} onClick={onOpen} className="group relative min-h-48 cursor-pointer overflow-hidden rounded-xl border border-admin-outline bg-white shadow-sm transition hover:border-uml-blue hover:shadow-lg"><div className="flex h-28 items-center justify-center border-b border-admin-outline bg-gradient-to-br from-white to-admin-bg"><ItemIcon item={item}/><span className="absolute right-3 top-3 rounded border border-admin-outline bg-white px-2 py-1 text-[8px] font-black uppercase tracking-widest text-admin-secondary">{item.kind}</span></div><div className="p-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold group-hover:text-uml-blue">{item.name}</h3><p className="mt-1 text-[10px] capitalize text-admin-secondary">{item.kind === 'diagram' ? `${item.diagramType || 'UML'} diagram` : item.kind === 'markdown' ? 'Project documentation' : 'Project folder'}</p></div><button onClick={e => { e.stopPropagation(); onMenu() }} className="rounded p-1 text-admin-secondary hover:bg-admin-bg"><MoreHorizontal size={16}/></button></div><div className="mt-5 flex items-center gap-1 text-[9px] text-admin-secondary"><Clock3 size={11}/> Updated recently</div></div>{menuOpen && <div onClick={e => e.stopPropagation()} className="absolute right-3 top-10 z-20 w-32 rounded-lg border border-admin-outline bg-white p-1 shadow-xl"><button onClick={onRename} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-admin-bg">Rename</button><button onClick={onDelete} className="block w-full rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50">Delete</button></div>}</motion.article> }
function ItemRow({ item, onOpen, onRename, onDelete }: { item: WorkspaceFileItem; onOpen: () => void; onRename: () => void; onDelete: () => void }) { return <div className="group flex items-center gap-3 border-b border-admin-outline px-4 py-3 last:border-0 hover:bg-admin-bg"><button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left"><ItemIcon item={item}/><span className="min-w-0"><b className="block truncate text-sm group-hover:text-uml-blue">{item.name}</b><small className="text-[10px] capitalize text-admin-secondary">{item.kind}{item.diagramType ? ` · ${item.diagramType}` : ''}</small></span></button><button onClick={onRename} className="rounded px-2 py-1 text-[10px] font-bold text-admin-secondary hover:bg-white">Rename</button><button onClick={onDelete} className="rounded px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50">Delete</button></div> }

function CreateModal({ projectId, parentId, items, onClose, onCreated }: { projectId: string; parentId: string | null; items: WorkspaceFileItem[]; onClose: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<WorkspaceFileKind>('diagram'); const [name, setName] = useState(''); const [type, setType] = useState<DiagramType>('activity'); const [busy, setBusy] = useState(false)
  const normalized = kind === 'markdown' ? `${name.trim().replace(/(?:\.md)+$/i, '')}.md` : name.trim(); const duplicate = items.some(x => x.parentId === parentId && x.name.toLowerCase() === normalized.toLowerCase())
  const submit = async () => { if (!normalized || duplicate || busy) return; setBusy(true); try { if (kind === 'diagram') { const response = await sheetService.createSheet({ name: normalized, projectId, orderIndex: items.filter(x => x.kind === 'diagram').length, diagramData: JSON.stringify({ nodes: [], edges: [], diagramType: type, viewport: { x: 0, y: 0, zoom: 1 } }) }); workspaceFileService.create(projectId, { id: `diagram:${response.result.id}`, name: normalized, kind, parentId, sheetId: response.result.id, diagramType: type }) } else workspaceFileService.create(projectId, { name: normalized, kind, parentId, content: kind === 'markdown' ? '' : undefined }); toast.success(`${kind} created`); onCreated() } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create item') } finally { setBusy(false) } }
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
        workspaceFileService.update(projectId, action.item.id, { name: name.trim() })
        if (action.item.kind === 'diagram' && action.item.sheetId) await sheetService.updateSheet(action.item.sheetId, { name: name.trim(), projectId })
      } else {
        const state = workspaceFileService.load(projectId)
        const removed = new Set([action.item.id]); let changed = true
        while (changed) { changed = false; state.items.forEach(item => { if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true } }) }
        const diagrams = state.items.filter(item => removed.has(item.id) && item.kind === 'diagram' && item.sheetId)
        for (const diagram of diagrams) await sheetService.deleteSheet(diagram.sheetId!)
        workspaceFileService.remove(projectId, action.item.id)
      }
      toast.success(action.mode === 'rename' ? 'Item renamed' : 'Item deleted')
      onDone()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Action failed') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="w-full max-w-md overflow-hidden rounded-xl border border-admin-outline bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-admin-outline p-5"><div><h2 className="text-lg font-bold">{action.mode === 'rename' ? 'Rename item' : 'Delete item?'}</h2><p className="mt-1 text-xs text-admin-secondary">{action.mode === 'rename' ? 'Choose a clear name for this project item.' : 'This action cannot be undone in the current prototype.'}</p></div><button onClick={onClose}><X size={18}/></button></header><div className="p-5">{action.mode === 'rename' ? <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Name</label><input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} className="h-10 w-full rounded-lg border border-admin-outline px-3 text-sm outline-none focus:border-uml-blue focus:ring-2 focus:ring-uml-blue/10"/></> : <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">Delete “{action.item.name}”?</p><p className="mt-1 text-xs leading-5 text-red-700">{action.item.kind === 'folder' ? 'Everything inside this folder will also be removed. ' : ''}Diagram deletion also removes its backend sheet.</p></div>}</div><footer className="flex justify-end gap-2 border-t border-admin-outline bg-admin-bg/50 p-4"><button onClick={onClose} className="rounded-lg border border-admin-outline bg-white px-4 py-2 text-xs font-bold">Cancel</button><button disabled={busy || (action.mode === 'rename' && !name.trim())} onClick={submit} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-40 ${action.mode === 'delete' ? 'bg-red-600' : 'bg-uml-blue'}`}>{busy ? 'Working…' : action.mode === 'rename' ? 'Save changes' : 'Delete'}</button></footer></div></div>
}
