import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Boxes, ChevronDown, ChevronRight, FileText, Folder, FolderOpen,
  GitBranch, MoreHorizontal, Network, Plus, Search, Share2, Trash2, Workflow, X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { DiagramType } from '../../types'
import type { WorkspaceFileItem, WorkspaceFileKind } from '../../types/workspaceFile'

interface Props {
  projectName: string
  items: WorkspaceFileItem[]
  activeId: string | null
  expandedIds: string[]
  onExpandedChange: (ids: string[]) => void
  onSelect: (item: WorkspaceFileItem, pinned?: boolean) => void
  onCreate: (kind: WorkspaceFileKind, name: string, parentId: string | null, diagramType?: DiagramType) => void | Promise<void>
  onRename: (item: WorkspaceFileItem, name: string) => void | Promise<void>
  onDelete: (item: WorkspaceFileItem) => void | Promise<void>
  onMove: (id: string, parentId: string | null) => void
  onDuplicate: (item: WorkspaceFileItem, parentId: string | null) => void | Promise<void>
  createRequest?: { id: number; kind: WorkspaceFileKind } | null
}

type Dialog =
  | { mode: 'create'; parentId: string | null; kind: WorkspaceFileKind }
  | { mode: 'rename'; item: WorkspaceFileItem }
  | { mode: 'move'; item: WorkspaceFileItem }
  | { mode: 'delete'; item: WorkspaceFileItem }
  | null

const types: Array<{ id: DiagramType; label: string; hint: string; icon: typeof Activity }> = [
  { id: 'usecase', label: 'Use Case', hint: 'Actors and goals', icon: Share2 },
  { id: 'class', label: 'Class', hint: 'Domain structure', icon: Boxes },
  { id: 'sequence', label: 'Sequence', hint: 'Message flow', icon: GitBranch },
  { id: 'activity', label: 'Activity', hint: 'Process workflow', icon: Activity },
  { id: 'state', label: 'State', hint: 'State transitions', icon: Workflow },
  { id: 'component', label: 'Component', hint: 'System modules', icon: Network },
  { id: 'deployment', label: 'Deployment', hint: 'Runtime topology', icon: Network },
]

const widthKey = 'diauml:explorer-width'
const defaultWidth = 280
const minWidth = 220
const maxWidth = 520

export default function ProjectExplorer(props: Props) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [width, setWidth] = useState(() => Math.min(maxWidth, Math.max(minWidth, Number(localStorage.getItem(widthKey)) || defaultWidth)))
  const [dialog, setDialog] = useState<Dialog>(null)
  const [context, setContext] = useState<{ x: number; y: number; item: WorkspaceFileItem | null } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(props.activeId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)

  const children = useMemo(() => {
    const map = new Map<string | null, WorkspaceFileItem[]>()
    props.items.forEach(item => map.set(item.parentId, [...(map.get(item.parentId) || []), item]))
    map.forEach(list => list.sort((a, b) => Number(b.kind === 'folder') - Number(a.kind === 'folder') || a.orderIndex - b.orderIndex || a.name.localeCompare(b.name)))
    return map
  }, [props.items])

  useEffect(() => () => {
    if (clickTimer.current) clearTimeout(clickTimer.current)
  }, [])

  useEffect(() => {
    if (!context) return
    const close = () => setContext(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('blur', close) }
  }, [context])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizeStart.current) return
      const next = Math.min(maxWidth, Math.max(minWidth, resizeStart.current.width + event.clientX - resizeStart.current.x))
      setWidth(next)
    }
    const up = () => {
      if (!resizeStart.current) return
      resizeStart.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      localStorage.setItem(widthKey, String(width))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [width])

  const toggle = (id: string) => props.onExpandedChange(props.expandedIds.includes(id) ? props.expandedIds.filter(x => x !== id) : [...props.expandedIds, id])
  const descendants = (id: string) => {
    const found = new Set([id]); let changed = true
    while (changed) { changed = false; props.items.forEach(item => { if (item.parentId && found.has(item.parentId) && !found.has(item.id)) { found.add(item.id); changed = true } }) }
    return found
  }
  const path = (parentId: string | null) => {
    const parts: string[] = []; let id = parentId
    while (id) { const item = props.items.find(value => value.id === id); if (!item) break; parts.unshift(item.name); id = item.parentId }
    return [props.projectName || 'Project', ...parts].join(' / ')
  }
  const moveItem = (itemId: string, parentId: string | null) => {
    const item = props.items.find(value => value.id === itemId)
    if (!item || item.parentId === parentId) return
    const previousParentId = item.parentId
    props.onMove(itemId, parentId)
    toast.success(
      <span className="flex items-center gap-3">Moved “{item.name}” <button className="font-black underline" onClick={() => props.onMove(itemId, previousParentId)}>Undo</button></span>,
      { duration: 5000 }
    )
  }

  const visibleIds = useMemo(() => {
    if (!query.trim()) return null
    const found = new Set<string>()
    props.items.forEach(item => {
      if (!item.name.toLowerCase().includes(query.trim().toLowerCase())) return
      found.add(item.id); let parent = item.parentId
      while (parent) { found.add(parent); parent = props.items.find(value => value.id === parent)?.parentId || null }
    })
    return found
  }, [props.items, query])

  const visibleItems = useMemo(() => {
    const result: WorkspaceFileItem[] = []
    const walk = (parentId: string | null) => (children.get(parentId) || []).forEach(item => {
      if (visibleIds && !visibleIds.has(item.id)) return
      result.push(item)
      if (item.kind === 'folder' && (visibleIds || props.expandedIds.includes(item.id))) walk(item.id)
    })
    walk(null)
    return result
  }, [children, visibleIds, props.expandedIds])

  const handleExplorerKeyDown = (event: React.KeyboardEvent) => {
    if (editingId || dialog) return
    const currentIndex = Math.max(0, visibleItems.findIndex(item => item.id === focusedId))
    const current = visibleItems[currentIndex]
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setFocusedId(visibleItems[Math.min(visibleItems.length - 1, Math.max(0, currentIndex + delta))]?.id || null)
    } else if (event.key === 'Enter' && current) {
      event.preventDefault(); current.kind === 'folder' ? toggle(current.id) : props.onSelect(current)
    } else if (event.key === 'F2' && current) {
      event.preventDefault(); beginInlineRename(current)
    } else if (event.key === 'Delete' && current) {
      event.preventDefault(); setDialog({ mode: 'delete', item: current })
    } else if (event.key === 'ArrowRight' && current?.kind === 'folder' && !props.expandedIds.includes(current.id)) {
      event.preventDefault(); toggle(current.id)
    } else if (event.key === 'ArrowLeft' && current?.kind === 'folder' && props.expandedIds.includes(current.id)) {
      event.preventDefault(); toggle(current.id)
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c' && current) {
      event.preventDefault(); setCopiedItemId(current.id); toast.success(`Copied “${current.name}”`)
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v' && copiedItemId) {
      event.preventDefault(); const copied = props.items.find(item => item.id === copiedItemId); if (copied) void props.onDuplicate(copied, current?.kind === 'folder' ? current.id : current?.parentId || null)
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault(); openCreate(current?.kind === 'folder' ? current.id : current?.parentId || null)
    }
  }

  const openCreate = (parentId: string | null, kind: WorkspaceFileKind = 'markdown') => setDialog({ mode: 'create', parentId, kind })
  useEffect(() => {
    if (props.createRequest) openCreate(null, props.createRequest.kind)
  }, [props.createRequest?.id])

  const beginInlineRename = (item: WorkspaceFileItem) => {
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = null
    setFocusedId(item.id)
    setEditingId(item.id)
    setEditingName(item.name)
    setRenameError('')
  }
  const cancelInlineRename = () => { setEditingId(null); setEditingName(''); setRenameError('') }
  const commitInlineRename = async (item: WorkspaceFileItem) => {
    let name = editingName.trim()
    if (item.kind === 'markdown' && name) name = `${name.replace(/(?:\.md)+$/i, '')}.md`
    if (!name) { setRenameError('Name is required.'); return }
    const duplicate = props.items.some(value => value.id !== item.id && value.parentId === item.parentId && value.name.toLowerCase() === name.toLowerCase())
    if (duplicate) { setRenameError('This name already exists here.'); return }
    if (name !== item.name) {
      const previousName = item.name
      await props.onRename(item, name)
      toast.success(
        <span className="flex items-center gap-3">Renamed to “{name}” <button className="font-black underline" onClick={() => void props.onRename({ ...item, name }, previousName)}>Undo</button></span>,
        { duration: 5000 }
      )
    }
    cancelInlineRename()
  }
  const handleItemClick = (item: WorkspaceFileItem) => {
    setFocusedId(item.id)
    if (editingId) return
    item.kind === 'folder' ? toggle(item.id) : props.onSelect(item, false)
  }
  const handleItemDoubleClick = (event: React.MouseEvent, item: WorkspaceFileItem) => {
    event.preventDefault()
    event.stopPropagation()
    if (item.kind === 'folder') return
    setFocusedId(item.id)
    props.onSelect(item, true)
  }

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => (children.get(parentId) || []).map(item => {
    if (visibleIds && !visibleIds.has(item.id)) return null
    const expanded = visibleIds ? true : props.expandedIds.includes(item.id)
    return <div key={item.id}>
      <div
        draggable
        onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('workspace-item', item.id); setDragId(item.id) }}
        onDragEnd={() => { setDragId(null); setDropId(null) }}
        onDragOver={event => { if (item.kind === 'folder') { event.preventDefault(); setDropId(item.id) } }}
        onDragLeave={() => setDropId(value => value === item.id ? null : value)}
        onDrop={event => { event.preventDefault(); event.stopPropagation(); const id = event.dataTransfer.getData('workspace-item'); if (id && id !== item.id) moveItem(id, item.id); setDropId(null) }}
        onClick={() => handleItemClick(item)}
        onDoubleClick={event => handleItemDoubleClick(event, item)}
        onContextMenu={event => { event.preventDefault(); event.stopPropagation(); setContext({ x: event.clientX, y: event.clientY, item }) }}
        className={`group relative flex h-8 cursor-pointer items-center gap-1.5 rounded-md pr-1 text-xs transition-colors ${props.activeId === item.id ? 'bg-uml-blue/10 font-bold text-uml-blue before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded before:bg-uml-blue' : focusedId === item.id ? 'bg-admin-bg text-admin-on-surface' : 'text-admin-on-surface hover:bg-admin-bg'} ${dropId === item.id ? 'ring-2 ring-inset ring-uml-blue bg-uml-blue/10' : ''} ${dragId === item.id ? 'opacity-40' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        title={`${path(item.parentId)} / ${item.name}`}
      >
        {item.kind === 'folder' ? (expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>) : <span className="w-[13px]"/>}
        <ItemGlyph item={item} expanded={expanded}/>
        {editingId === item.id ? <div className="relative min-w-0 flex-1" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
          <input autoFocus value={editingName} onChange={event => { setEditingName(event.target.value); setRenameError('') }} onBlur={() => { if (!renameError) void commitInlineRename(item) }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') void commitInlineRename(item); if (event.key === 'Escape') cancelInlineRename() }} className={`h-6 w-full rounded border bg-white px-1.5 text-xs text-admin-on-surface outline-none ${renameError ? 'border-red-500' : 'border-uml-blue ring-1 ring-uml-blue/20'}`}/>
          {renameError && <span className="absolute left-0 top-7 z-50 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-[9px] font-medium text-white shadow-lg">{renameError}</span>}
        </div> : <span className="min-w-0 flex-1 truncate" onDoubleClick={event => handleItemDoubleClick(event, item)}><HighlightName name={item.name} query={query}/></span>}
        {editingId !== item.id && <button onClick={event => { event.stopPropagation(); const box = event.currentTarget.getBoundingClientRect(); setContext({ x: box.right, y: box.bottom, item }) }} className="invisible rounded p-1 text-admin-secondary hover:bg-white group-hover:visible" aria-label={`Actions for ${item.name}`}><MoreHorizontal size={14}/></button>}
      </div>
      {item.kind === 'folder' && expanded && renderTree(item.id, depth + 1)}
    </div>
  })

  if (collapsed) return <button onClick={() => setCollapsed(false)} className="flex w-10 shrink-0 items-start justify-center border-r border-admin-outline bg-white pt-4 text-admin-secondary hover:text-uml-blue" title="Open Project Explorer"><ChevronRight size={17}/></button>

  return <>
    <aside tabIndex={0} onKeyDown={handleExplorerKeyDown} className="relative flex shrink-0 flex-col border-r border-admin-outline bg-white outline-none focus-within:ring-1 focus-within:ring-inset focus-within:ring-uml-blue/10" style={{ width }}>
      <header className="flex h-12 items-center gap-2 border-b border-admin-outline px-3">
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-black uppercase tracking-wider">{props.projectName || 'Project'}</p><p className="text-[9px] font-bold uppercase tracking-widest text-admin-secondary">Project explorer</p></div>
        <button onClick={() => openCreate(null)} className="rounded-md p-1.5 text-admin-secondary transition hover:bg-admin-bg hover:text-uml-blue" title="Create item"><Plus size={16}/></button>
        <button onClick={() => setCollapsed(true)} className="rounded-md p-1.5 text-admin-secondary transition hover:bg-admin-bg" title="Collapse Explorer"><X size={15}/></button>
      </header>
      <div className="relative m-2 mb-1"><Search size={13} className="absolute left-2.5 top-2.5 text-admin-secondary"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files…" className="h-8 w-full rounded-md border border-admin-outline bg-admin-bg pl-8 pr-8 text-xs outline-none transition focus:border-uml-blue focus:bg-white"/>{query && <button onClick={() => setQuery('')} className="absolute right-2 top-2 text-admin-secondary"><X size={14}/></button>}</div>
      <div className="flex items-center justify-between px-3 py-2"><span className="text-[9px] font-black uppercase tracking-[0.16em] text-admin-secondary">Files</span><span className="text-[10px] text-admin-secondary">{props.items.length}</span></div>
      <div
        className={`min-h-0 flex-1 overflow-auto px-1.5 ${dropId === 'root' ? 'bg-uml-blue/5' : ''}`}
        onClick={event => { if (event.target === event.currentTarget) { setFocusedId(null); setContext(null) } }}
        onContextMenu={event => { event.preventDefault(); setFocusedId(null); setContext({ x: event.clientX, y: event.clientY, item: null }) }}
        onDragOver={event => { event.preventDefault(); setDropId('root') }}
        onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('workspace-item'); if (id) moveItem(id, null); setDropId(null) }}
      >
        {props.items.length ? renderTree(null) : <div className="mx-3 mt-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-admin-outline bg-admin-bg text-admin-secondary"><Folder size={20}/></div><p className="mt-3 text-xs font-bold">No project files yet</p><p className="mt-1 text-[11px] leading-4 text-admin-secondary">Create documentation, a diagram, or a folder.</p><button onClick={() => openCreate(null)} className="mt-3 rounded-md bg-uml-blue px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700">Create first item</button></div>}
        {visibleIds && visibleIds.size === 0 && <div className="px-4 py-10 text-center text-xs text-admin-secondary">No files match “{query}”.</div>}
      </div>
      <div className="border-t border-admin-outline px-3 py-2 text-[9px] text-admin-secondary">{dragId ? `Move to: ${dropId && dropId !== 'root' ? path(dropId) : (props.projectName || 'Project')}` : 'F2 rename · Del delete · Right-click for actions'}</div>
      <div
        onPointerDown={event => { resizeStart.current = { x: event.clientX, width }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }}
        onDoubleClick={() => { setWidth(defaultWidth); localStorage.setItem(widthKey, String(defaultWidth)) }}
        className="absolute -right-1 top-0 z-30 h-full w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-px after:bg-transparent hover:after:bg-uml-blue"
        title="Drag to resize · Double-click to reset"
      />
    </aside>

    {context && <div onPointerDown={event => event.stopPropagation()} className="fixed z-[150] w-48 rounded-lg border border-admin-outline bg-white p-1.5 shadow-[0_16px_50px_rgba(15,23,42,.18)]" style={{ left: Math.min(context.x, window.innerWidth - 205), top: Math.min(context.y, window.innerHeight - 230) }}>
      {!context.item ? <>
        <p className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-admin-secondary">Create in project</p>
        <MenuButton icon={<FileText size={14}/>} label="New Markdown" onClick={() => { openCreate(null, 'markdown'); setContext(null) }}/>
        <MenuButton icon={<Workflow size={14}/>} label="New Diagram" onClick={() => { openCreate(null, 'diagram'); setContext(null) }}/>
        <MenuButton icon={<Folder size={14}/>} label="New Folder" onClick={() => { openCreate(null, 'folder'); setContext(null) }}/>
        {copiedItemId && <><div className="my-1 border-t border-admin-outline"/><MenuButton icon={<FileText size={14}/>} label="Paste" shortcut="Ctrl V" onClick={() => { const item = props.items.find(value => value.id === copiedItemId); if (item) void props.onDuplicate(item, null); setContext(null) }}/></>}
      </> : <ItemContextMenu item={context.item} canPaste={!!copiedItemId} onClose={() => setContext(null)} onOpen={() => props.onSelect(context.item!)} onCreate={() => openCreate(context.item!.id)} onCopy={() => setCopiedItemId(context.item!.id)} onPaste={() => { const item = props.items.find(value => value.id === copiedItemId); if (item) void props.onDuplicate(item, context.item!.kind === 'folder' ? context.item!.id : context.item!.parentId) }} onRename={() => beginInlineRename(context.item!)} onMove={() => setDialog({ mode: 'move', item: context.item! })} onDelete={() => setDialog({ mode: 'delete', item: context.item! })}/>} 
    </div>}

    {dialog && <WorkspaceDialog
      dialog={dialog}
      items={props.items}
      projectName={props.projectName}
      path={path}
      descendants={descendants}
      onClose={() => setDialog(null)}
      onKindChange={kind => dialog.mode === 'create' && setDialog({ ...dialog, kind })}
      onCreate={async (kind, name, parentId, type) => { await props.onCreate(kind, name, parentId, type); if (parentId && !props.expandedIds.includes(parentId)) props.onExpandedChange([...props.expandedIds, parentId]); setDialog(null) }}
      onRename={async (item, name) => { await props.onRename(item, name); setDialog(null) }}
      onMove={(item, parentId) => { moveItem(item.id, parentId); setDialog(null) }}
      onDelete={async item => { await props.onDelete(item); setDialog(null) }}
    />}
  </>
}

function ItemGlyph({ item, expanded }: { item: WorkspaceFileItem; expanded: boolean }) {
  if (item.kind === 'folder') return expanded ? <FolderOpen size={15}/> : <Folder size={15}/>
  if (item.kind === 'markdown') return <FileText size={15}/>
  if (item.diagramType === 'class') return <Boxes size={15}/>
  if (item.diagramType === 'sequence') return <GitBranch size={15}/>
  if (item.diagramType === 'component' || item.diagramType === 'deployment') return <Network size={15}/>
  if (item.diagramType === 'activity' || item.diagramType === 'state') return <Activity size={15}/>
  return <Workflow size={15}/>
}

function ItemContextMenu({ item, canPaste, onClose, onOpen, onCreate, onCopy, onPaste, onRename, onMove, onDelete }: { item: WorkspaceFileItem; canPaste: boolean; onClose: () => void; onOpen: () => void; onCreate: () => void; onCopy: () => void; onPaste: () => void; onRename: () => void; onMove: () => void; onDelete: () => void }) {
  const run = (action: () => void) => { action(); onClose() }
  return <>
    {item.kind === 'folder' ? <><MenuButton icon={<Plus size={14}/>} label="New inside…" onClick={() => run(onCreate)}/><div className="my-1 border-t border-admin-outline"/></> : <MenuButton icon={<Workflow size={14}/>} label="Open" onClick={() => run(onOpen)}/>} 
    <MenuButton icon={<FileText size={14}/>} label="Copy" shortcut="Ctrl C" onClick={() => run(onCopy)}/>
    {canPaste && <MenuButton icon={<FolderOpen size={14}/>} label={item.kind === 'folder' ? 'Paste inside' : 'Paste here'} shortcut="Ctrl V" onClick={() => run(onPaste)}/>} 
    <MenuButton icon={<FileText size={14}/>} label="Rename" shortcut="F2" onClick={() => run(onRename)}/>
    <MenuButton icon={<FolderOpen size={14}/>} label="Move to…" onClick={() => run(onMove)}/>
    <div className="my-1 border-t border-admin-outline"/>
    <MenuButton danger icon={<Trash2 size={14}/>} label="Delete" shortcut="Del" onClick={() => run(onDelete)}/>
  </>
}

function MenuButton({ icon, label, shortcut, onClick, danger = false }: { icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-admin-on-surface hover:bg-admin-bg'}`}>{icon}<span className="flex-1">{label}</span>{shortcut && <kbd className="text-[9px] font-medium text-admin-secondary">{shortcut}</kbd>}</button>
}

function HighlightName({ name, query }: { name: string; query: string }) {
  const value = query.trim()
  if (!value) return <>{name}</>
  const index = name.toLowerCase().indexOf(value.toLowerCase())
  if (index < 0) return <>{name}</>
  return <>{name.slice(0, index)}<mark className="rounded-sm bg-amber-200 px-0.5 text-inherit">{name.slice(index, index + value.length)}</mark>{name.slice(index + value.length)}</>
}

function WorkspaceDialog({ dialog, items, projectName, path, descendants, onClose, onKindChange, onCreate, onRename, onMove, onDelete }: {
  dialog: Exclude<Dialog, null>; items: WorkspaceFileItem[]; projectName: string; path: (id: string | null) => string; descendants: (id: string) => Set<string>; onClose: () => void; onKindChange: (kind: WorkspaceFileKind) => void
  onCreate: (kind: WorkspaceFileKind, name: string, parentId: string | null, type?: DiagramType) => Promise<void>; onRename: (item: WorkspaceFileItem, name: string) => Promise<void>; onMove: (item: WorkspaceFileItem, parentId: string | null) => void; onDelete: (item: WorkspaceFileItem) => Promise<void>
}) {
  const create = dialog.mode === 'create'
  const [name, setName] = useState(create ? '' : dialog.mode === 'rename' ? dialog.item.name : '')
  const [type, setType] = useState<DiagramType>('activity')
  const [location, setLocation] = useState<string | null>(create ? dialog.parentId : dialog.mode === 'move' ? dialog.item.parentId : null)
  const [busy, setBusy] = useState(false)
  const kind = create ? dialog.kind : dialog.mode === 'rename' ? dialog.item.kind : 'folder'
  const normalized = kind === 'markdown' && name.trim() ? `${name.trim().replace(/(?:\.md)+$/i, '')}.md` : name.trim()
  const duplicate = items.some(item => item.parentId === (create ? dialog.parentId : dialog.mode === 'rename' ? dialog.item.parentId : location) && item.name.toLowerCase() === normalized.toLowerCase() && (!('item' in dialog) || item.id !== dialog.item.id))
  const blocked = dialog.mode === 'move' ? descendants(dialog.item.id) : new Set<string>()
  const folders = items.filter(item => item.kind === 'folder' && !blocked.has(item.id))
  const nestedCount = dialog.mode === 'delete' ? descendants(dialog.item.id).size - 1 : 0
  const canSubmit = dialog.mode === 'delete' || dialog.mode === 'move' || (!!normalized && !duplicate)
  const title = create ? 'Create new item' : dialog.mode === 'rename' ? `Rename ${dialog.item.kind}` : dialog.mode === 'move' ? 'Move item' : 'Delete item?'

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    try {
      if (create) await onCreate(kind, normalized, dialog.parentId, kind === 'diagram' ? type : undefined)
      else if (dialog.mode === 'rename') await onRename(dialog.item, normalized)
      else if (dialog.mode === 'move') onMove(dialog.item, location)
      else await onDelete(dialog.item)
    } finally { setBusy(false) }
  }

  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" className="w-full max-w-xl animate-pop overflow-hidden rounded-xl border border-admin-outline bg-white shadow-[0_30px_90px_rgba(15,23,42,.25)]">
      <header className="flex items-start justify-between border-b border-admin-outline px-6 py-5"><div><h2 className="text-lg font-bold text-admin-on-surface">{title}</h2><p className="mt-1 text-xs text-admin-secondary">{create ? `Add content to ${path(dialog.parentId)}.` : dialog.mode === 'delete' ? 'Review the impact before continuing.' : `Current location: ${path('item' in dialog ? dialog.item.parentId : null)}`}</p></div><button onClick={onClose} className="rounded-md p-1.5 text-admin-secondary hover:bg-admin-bg"><X size={18}/></button></header>
      <div className="max-h-[68vh] overflow-auto px-6 py-5">
        {create && <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Item type</label><div className="mb-5 grid grid-cols-3 gap-2">{(['markdown', 'diagram', 'folder'] as WorkspaceFileKind[]).map(value => <button key={value} onClick={() => onKindChange(value)} className={`rounded-lg border p-3 text-left transition ${kind === value ? 'border-uml-blue bg-uml-blue/5 text-uml-blue ring-1 ring-uml-blue' : 'border-admin-outline hover:border-uml-blue/50 hover:bg-admin-bg'}`}><span className="text-xs font-bold capitalize">{value}</span><span className="mt-1 block text-[10px] text-admin-secondary">{value === 'markdown' ? 'Project documentation' : value === 'diagram' ? 'Visual system model' : 'Organize your files'}</span></button>)}</div></>}
        {(create || dialog.mode === 'rename') && <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Name</label><input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} placeholder={kind === 'markdown' ? 'requirements.md' : kind === 'diagram' ? 'Authentication flow' : 'Architecture'} className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition ${duplicate ? 'border-red-400 bg-red-50/30' : 'border-admin-outline focus:border-uml-blue focus:ring-2 focus:ring-uml-blue/10'}`}/><div className="mb-5 mt-1.5 min-h-4 text-[11px]">{duplicate ? <span className="text-red-600">An item with this name already exists here.</span> : kind === 'markdown' && normalized ? <span className="text-admin-secondary">Will be saved as <b>{normalized}</b></span> : null}</div></>}
        {create && kind === 'diagram' && <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Diagram type</label><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{types.map(option => { const Icon = option.icon; return <button key={option.id} onClick={() => setType(option.id)} className={`flex items-start gap-2 rounded-lg border p-3 text-left transition ${type === option.id ? 'border-uml-blue bg-uml-blue/5 ring-1 ring-uml-blue' : 'border-admin-outline hover:bg-admin-bg'}`}><Icon size={16} className={type === option.id ? 'text-uml-blue' : 'text-admin-secondary'}/><span><b className="block text-xs">{option.label}</b><small className="text-[10px] text-admin-secondary">{option.hint}</small></span></button>})}</div></>}
        {dialog.mode === 'move' && <><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-admin-secondary">Destination</label><div className="max-h-64 overflow-auto rounded-lg border border-admin-outline p-2"><FolderChoice label={projectName || 'Project root'} depth={0} active={location === null} onClick={() => setLocation(null)}/>{folders.map(folder => <FolderChoice key={folder.id} label={folder.name} depth={folderDepth(folder, items)} active={location === folder.id} onClick={() => setLocation(folder.id)}/>)}</div></>}
        {dialog.mode === 'delete' && <div className="rounded-lg border border-red-200 bg-red-50 p-4"><div className="flex gap-3"><div className="mt-0.5 text-red-600"><Trash2 size={19}/></div><div><p className="text-sm font-bold text-red-900">Delete “{dialog.item.name}”?</p><p className="mt-1 text-xs leading-5 text-red-700">{dialog.item.kind === 'folder' && nestedCount ? `This also removes ${nestedCount} nested item${nestedCount === 1 ? '' : 's'}. ` : ''}This action cannot be undone in the current prototype.</p></div></div></div>}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-admin-outline bg-admin-bg/50 px-6 py-4"><button onClick={onClose} className="rounded-lg border border-admin-outline bg-white px-4 py-2 text-xs font-bold text-admin-secondary hover:bg-admin-bg">Cancel</button><button disabled={!canSubmit || busy} onClick={submit} className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${dialog.mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-uml-blue hover:bg-blue-700'}`}>{busy ? 'Working…' : dialog.mode === 'delete' ? 'Delete' : dialog.mode === 'move' ? 'Move here' : create ? `Create ${kind}` : 'Save changes'}</button></footer>
    </div>
  </div>
}

function FolderChoice({ label, depth, active, onClick }: { label: string; depth: number; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-xs transition ${active ? 'bg-uml-blue/10 font-bold text-uml-blue' : 'hover:bg-admin-bg'}`} style={{ paddingLeft: 8 + Math.min(depth, 6) * 14 }}><span className={`h-3.5 w-3.5 rounded-full border ${active ? 'border-uml-blue bg-uml-blue shadow-[inset_0_0_0_3px_white]' : 'border-admin-outline'}`}/><Folder size={14}/><span className="truncate">{label}</span></button>
}

function folderDepth(item: WorkspaceFileItem, items: WorkspaceFileItem[]) {
  let depth = 1; let parent = item.parentId
  while (parent) { depth++; parent = items.find(value => value.id === parent)?.parentId || null }
  return depth
}
