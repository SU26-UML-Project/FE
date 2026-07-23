import { useEffect, useRef, useState } from 'react'
import { Clock3, Eye, GitCompare, History, Loader2, RotateCcw, Save, X } from 'lucide-react'
import { Background, ReactFlow, ReactFlowProvider, type Viewport } from '@xyflow/react'
import { toast } from 'react-hot-toast'
import { diagramVersionService } from '../../projects/api/diagramVersionApi'
import { nodeTypes } from '../Canvas/Nodes'
import { edgeTypes } from '../Canvas/Edges'
import type { DiagramSnapshot, DiagramVersion } from '../../types'

interface Props {
  sheetId: string
  current: DiagramSnapshot
  previewingId: string | null
  onPreview: (version: DiagramVersion | null) => void
  onCreate: (name: string, note: string) => void | Promise<void>
  onRestore: (version: DiagramVersion) => void | Promise<void>
  onClose: () => void
}

export default function VersionHistoryPanel({ sheetId, current, previewingId, onPreview, onCreate, onRestore, onClose }: Props) {
  const [revision, setRevision] = useState(0)
  const [versions, setVersions] = useState<DiagramVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'changes' | 'side'>('changes')
  const [includePosition, setIncludePosition] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [restoreVersion, setRestoreVersion] = useState<DiagramVersion | null>(null)
  const [fullCompare, setFullCompare] = useState(false)
  // Snapshot lazy-load theo version (danh sách server không kèm diagramData)
  const snapshotCache = useRef(new Map<string, DiagramSnapshot>())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    diagramVersionService.list(sheetId)
      .then(items => { if (!cancelled) setVersions(items) })
      .catch(error => { if (!cancelled) toast.error(error instanceof Error ? error.message : 'Unable to load versions') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sheetId, revision])

  const selectedBase = versions.find(version => version.id === selectedId) || versions[0] || null
  const selectedSnapshot = selectedBase ? selectedBase.snapshot ?? snapshotCache.current.get(selectedBase.id) : undefined
  const selected: DiagramVersion | null = selectedBase ? { ...selectedBase, snapshot: selectedSnapshot } : null

  useEffect(() => {
    const target = selectedBase
    if (!target || target.snapshot || snapshotCache.current.has(target.id)) return
    let cancelled = false
    diagramVersionService.get(sheetId, target.id)
      .then(detail => {
        if (cancelled || !detail.snapshot) return
        snapshotCache.current.set(target.id, detail.snapshot)
        // Bump để re-render với snapshot đã cache (versions giữ nguyên)
        setVersions(previous => [...previous])
      })
      .catch(error => { if (!cancelled) toast.error(error instanceof Error ? error.message : 'Unable to load version content') })
    return () => { cancelled = true }
  }, [sheetId, selectedBase])

  const diff = selected?.snapshot ? diagramVersionService.diff(selected.snapshot, current, includePosition) : null
  const total = diff ? diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length + diff.addedEdges.length + diff.removedEdges.length + diff.changedEdges.length : 0

  return <>
    <aside className="flex w-[390px] shrink-0 flex-col border-l border-admin-outline bg-white shadow-[-12px_0_35px_rgba(15,23,42,.06)]">
      <header className="flex h-14 items-center gap-3 border-b border-admin-outline px-4"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uml-blue/10 text-uml-blue"><History size={17}/></div><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Version history</h2><p className="text-[9px] font-bold uppercase tracking-widest text-admin-secondary">Synced with your project</p></div><button onClick={onClose} className="rounded-md p-1.5 text-admin-secondary hover:bg-admin-bg"><X size={17}/></button></header>
      {previewingId && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3"><p className="text-xs font-bold text-amber-900">Read-only preview</p><button onClick={() => onPreview(null)} className="mt-1 text-[11px] font-bold text-amber-700 underline">Back to current version</button></div>}
      <div className="flex border-b border-admin-outline p-2"><button onClick={() => setCreateOpen(true)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-uml-blue px-3 py-2 text-xs font-bold text-white"><Save size={14}/> Save version</button></div>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? <div className="flex items-center justify-center px-8 py-16"><Loader2 size={22} className="animate-spin text-uml-blue"/></div> : !versions.length ? <div className="px-8 py-16 text-center"><History size={28} className="mx-auto text-admin-outline"/><p className="mt-3 text-sm font-bold">No saved versions</p><p className="mt-1 text-xs leading-5 text-admin-secondary">Create a checkpoint before a major edit, import, or AI change.</p></div> : <>
          <div className="border-b border-admin-outline p-3"><p className="mb-2 text-[9px] font-black uppercase tracking-widest text-admin-secondary">Versions</p><div className="space-y-1">{versions.map(version => <button key={version.id} onClick={() => setSelectedId(version.id)} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${selected?.id === version.id ? 'border-uml-blue bg-uml-blue/5' : 'border-transparent hover:bg-admin-bg'}`}><span className="mt-1 h-2 w-2 rounded-full bg-uml-blue"/><span className="min-w-0 flex-1"><b className="block truncate text-xs">{version.name}</b><span className="mt-1 flex items-center gap-1 text-[9px] text-admin-secondary"><Clock3 size={10}/>{new Date(version.createdAt).toLocaleString()} · {version.source.toLowerCase().replaceAll('_', ' ')}</span>{version.note && <small className="mt-1 block truncate text-[10px] text-admin-secondary">{version.note}</small>}</span><span className="text-[9px] font-bold text-admin-secondary">v{version.versionNumber}</span></button>)}</div></div>
          {selected && <div className="p-3">{!selected.snapshot ? <div className="flex items-center justify-center gap-2 rounded-lg border border-admin-outline bg-admin-bg p-4 text-xs text-admin-secondary"><Loader2 size={14} className="animate-spin"/> Loading version content…</div> : <><div className="mb-3 flex gap-1 rounded-lg border border-admin-outline bg-admin-bg p-1"><button onClick={() => setTab('changes')} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold ${tab === 'changes' ? 'bg-white text-uml-blue shadow-sm' : 'text-admin-secondary'}`}>Changes ({total})</button><button onClick={() => setTab('side')} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold ${tab === 'side' ? 'bg-white text-uml-blue shadow-sm' : 'text-admin-secondary'}`}>Side by side</button></div>
            <label className="mb-3 flex items-center gap-2 text-[10px] text-admin-secondary"><input type="checkbox" checked={includePosition} onChange={event => setIncludePosition(event.target.checked)}/> Include position changes</label>
            {tab === 'changes' ? <ChangeList diff={diff!}/> : <><SideBySide oldVersion={selected.snapshot} current={current}/><button onClick={() => setFullCompare(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-uml-blue/30 bg-uml-blue/5 px-3 py-2 text-xs font-bold text-uml-blue"><GitCompare size={14}/>Open full canvas compare</button></>}
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => onPreview(previewingId === selected.id ? null : selected)} className="flex items-center justify-center gap-1.5 rounded-lg border border-admin-outline px-3 py-2 text-xs font-bold hover:border-uml-blue hover:text-uml-blue"><Eye size={14}/>{previewingId === selected.id ? 'Current' : 'Preview'}</button><button onClick={() => setRestoreVersion(selected)} className="flex items-center justify-center gap-1.5 rounded-lg bg-uml-blue px-3 py-2 text-xs font-bold text-white"><RotateCcw size={14}/>Restore</button></div>
          </>}</div>}
        </>}
      </div>
    </aside>
    {createOpen && <SaveVersionDialog onClose={() => setCreateOpen(false)} onSave={async (name, note) => { await onCreate(name, note); setCreateOpen(false); setRevision(value => value + 1) }}/>}
    {restoreVersion?.snapshot && <RestoreDialog version={restoreVersion} diff={diagramVersionService.diff(restoreVersion.snapshot, current)} onClose={() => setRestoreVersion(null)} onRestore={async () => { await onRestore(restoreVersion); setRestoreVersion(null); setRevision(value => value + 1) }}/>}
    {fullCompare && selected?.snapshot && <FullCanvasCompare version={{ ...selected, snapshot: selected.snapshot }} current={current} includePosition={includePosition} onClose={() => setFullCompare(false)} onRestore={() => { setFullCompare(false); setRestoreVersion(selected) }}/>}
  </>
}

function label(node: { data?: unknown; id: string }) { const data = node.data as { label?: string } | undefined; return data?.label || node.id }
function ChangeList({ diff }: { diff: NonNullable<ReturnType<typeof diagramVersionService.diff>> }) {
  const empty = !diff.addedNodes.length && !diff.removedNodes.length && !diff.changedNodes.length && !diff.addedEdges.length && !diff.removedEdges.length && !diff.changedEdges.length
  if (empty) return <div className="rounded-lg border border-admin-outline bg-admin-bg p-4 text-center text-xs text-admin-secondary">No content changes.</div>
  return <div className="space-y-1 text-[11px]">{diff.addedNodes.map(node => <Change key={`a-${node.id}`} color="green" text={`Added node: ${label(node)}`}/>)}{diff.removedNodes.map(node => <Change key={`r-${node.id}`} color="red" text={`Removed node: ${label(node)}`}/>)}{diff.changedNodes.map(item => <Change key={`c-${item.after.id}`} color="amber" text={`Changed ${label(item.after)}: ${item.fields.join(', ')}`}/>)}{diff.addedEdges.map(edge => <Change key={`ae-${edge.id}`} color="green" text={`Added edge: ${edge.source} → ${edge.target}`}/>)}{diff.removedEdges.map(edge => <Change key={`re-${edge.id}`} color="red" text={`Removed edge: ${edge.source} → ${edge.target}`}/>)}{diff.changedEdges.map(item => <Change key={`ce-${item.after.id}`} color="amber" text={`Changed edge ${item.after.source} → ${item.after.target}`}/>)}</div>
}
function Change({ color, text }: { color: 'green' | 'red' | 'amber'; text: string }) { const style = color === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : color === 'red' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'; return <div className={`rounded-md border px-2.5 py-2 ${style}`}>{text}</div> }
function SideBySide({ oldVersion, current }: { oldVersion: DiagramSnapshot; current: DiagramSnapshot }) { return <div className="grid grid-cols-2 gap-2"><VersionColumn title="Selected" snapshot={oldVersion}/><VersionColumn title="Current" snapshot={current}/></div> }
function VersionColumn({ title, snapshot }: { title: string; snapshot: DiagramSnapshot }) { return <div className="min-w-0 rounded-lg border border-admin-outline p-2"><b className="text-[10px] uppercase tracking-wider">{title}</b><p className="mt-1 text-[9px] text-admin-secondary">{snapshot.nodes.length} nodes · {snapshot.edges.length} edges</p><div className="mt-2 max-h-48 space-y-1 overflow-auto">{snapshot.nodes.map(node => <div key={node.id} className="truncate rounded bg-admin-bg px-2 py-1 text-[9px]">{label(node)}</div>)}</div></div> }

function FullCanvasCompare({ version, current, includePosition, onClose, onRestore }: { version: DiagramVersion & { snapshot: DiagramSnapshot }; current: DiagramSnapshot; includePosition: boolean; onClose: () => void; onRestore: () => void }) {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.8 })
  const diff = diagramVersionService.diff(version.snapshot, current, includePosition)
  const oldRemoved = new Set(diff.removedNodes.map(node => node.id)); const currentAdded = new Set(diff.addedNodes.map(node => node.id)); const changed = new Set(diff.changedNodes.map(item => item.after.id))
  const oldNodes = version.snapshot.nodes.map(node => ({ ...node, style: { ...node.style, boxShadow: oldRemoved.has(node.id) ? '0 0 0 3px #ef4444' : changed.has(node.id) ? '0 0 0 3px #f59e0b' : undefined, opacity: oldRemoved.has(node.id) ? .72 : 1 } }))
  const currentNodes = current.nodes.map(node => ({ ...node, style: { ...node.style, boxShadow: currentAdded.has(node.id) ? '0 0 0 3px #10b981' : changed.has(node.id) ? '0 0 0 3px #f59e0b' : undefined } }))
  const total = diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length + diff.addedEdges.length + diff.removedEdges.length + diff.changedEdges.length
  return <div className="fixed inset-0 z-[280] flex flex-col bg-white">
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-admin-outline px-4"><GitCompare size={18} className="text-uml-blue"/><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Compare {version.name} with current</h2><p className="text-[10px] text-admin-secondary">{total} changes · synchronized pan and zoom</p></div><div className="flex items-center gap-3 text-[10px] font-bold"><span className="text-emerald-700">● Added</span><span className="text-red-700">● Removed</span><span className="text-amber-700">● Modified</span></div><button onClick={onRestore} className="rounded-lg bg-uml-blue px-3 py-2 text-xs font-bold text-white">Review restore</button><button onClick={onClose} className="rounded-md p-2 hover:bg-admin-bg"><X size={18}/></button></header>
    <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-admin-outline">
      <CompareCanvas title={`${version.name} · v${version.versionNumber}`} nodes={oldNodes} edges={version.snapshot.edges} viewport={viewport} onViewport={setViewport}/>
      <CompareCanvas title="Current version" nodes={currentNodes} edges={current.edges} viewport={viewport} onViewport={setViewport}/>
    </div>
  </div>
}
function CompareCanvas({ title, nodes, edges, viewport, onViewport }: { title: string; nodes: DiagramSnapshot['nodes']; edges: DiagramSnapshot['edges']; viewport: Viewport; onViewport: (viewport: Viewport) => void }) { return <div className="relative min-h-0"><div className="absolute left-3 top-3 z-20 rounded-lg border border-admin-outline bg-white/90 px-3 py-2 text-xs font-bold shadow-sm backdrop-blur">{title}</div><ReactFlowProvider><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} viewport={viewport} onMove={(_, next) => onViewport(next)} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={0.15} maxZoom={2.5} proOptions={{ hideAttribution: true }}><Background gap={18} size={1}/></ReactFlow></ReactFlowProvider></div> }

function SaveVersionDialog({ onClose, onSave }:  { onClose: () => void; onSave: (name: string, note: string) => void | Promise<void> }) { const [name, setName] = useState(''); const [note, setNote] = useState(''); return <Modal title="Save a version" subtitle="Create a named checkpoint of the current diagram." onClose={onClose}><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Before payment refactor" className="h-10 w-full rounded-lg border border-admin-outline px-3 text-sm outline-none focus:border-uml-blue"/><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Optional note" className="mt-3 h-24 w-full resize-none rounded-lg border border-admin-outline p-3 text-sm outline-none focus:border-uml-blue"/><div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-admin-outline px-4 py-2 text-xs font-bold">Cancel</button><button disabled={!name.trim()} onClick={() => onSave(name, note)} className="rounded-lg bg-uml-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Save version</button></div></Modal> }
function RestoreDialog({ version, diff, onClose, onRestore }: { version: DiagramVersion; diff: ReturnType<typeof diagramVersionService.diff>; onClose: () => void; onRestore: () => void | Promise<void> }) { const total = diff.addedNodes.length + diff.removedNodes.length + diff.changedNodes.length + diff.addedEdges.length + diff.removedEdges.length + diff.changedEdges.length; return <Modal title={`Restore “${version.name}”?`} subtitle="The current diagram will be backed up before restore." onClose={onClose}><div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">This restore applies {total} detected changes. It creates a new current state; existing history is not deleted.</div><div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg border border-admin-outline px-4 py-2 text-xs font-bold">Cancel</button><button onClick={onRestore} className="rounded-lg bg-uml-blue px-4 py-2 text-xs font-bold text-white">Backup & restore</button></div></Modal> }
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="w-full max-w-md rounded-xl border border-admin-outline bg-white p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between"><div><h3 className="text-lg font-bold">{title}</h3><p className="mt-1 text-xs text-admin-secondary">{subtitle}</p></div><button onClick={onClose}><X size={18}/></button></div>{children}</div></div> }
