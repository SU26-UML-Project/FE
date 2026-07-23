import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, GripVertical, Workflow, X } from 'lucide-react'
import type { WorkspaceFileItem } from '../../types'

export interface WorkspaceTab { itemId: string; pinned: boolean }

export default function WorkspaceTabs({ tabs, items, activeId, onSelect, onClose, onCloseMany, onReorder }: { tabs: WorkspaceTab[]; items: WorkspaceFileItem[]; activeId: string | null; onSelect: (id: string) => void; onClose: (id: string) => void; onCloseMany: (ids: string[]) => void; onReorder: (sourceId: string, targetId: string) => void }) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [context, setContext] = useState<{ x: number; y: number; itemId: string } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const updateOverflow = () => { const el = scroller.current; if (!el) return; setCanLeft(el.scrollLeft > 1); setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1) }
  useEffect(() => { updateOverflow(); const el = scroller.current; if (!el) return; const observer = new ResizeObserver(updateOverflow); observer.observe(el); return () => observer.disconnect() }, [tabs.length])
  useEffect(() => {
    const container = scroller.current
    const active = container?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(activeId || '')}"]`)
    if (!container || !active) return
    // Scroll only the tab strip. scrollIntoView() also scrolls outer flex/page
    // ancestors horizontally, which made the whole workspace jump to the last tab.
    const left = active.offsetLeft
    const right = left + active.offsetWidth
    if (left < container.scrollLeft) container.scrollTo({ left, behavior: 'smooth' })
    else if (right > container.scrollLeft + container.clientWidth) container.scrollTo({ left: right - container.clientWidth, behavior: 'smooth' })
    setTimeout(updateOverflow, 180)
  }, [activeId])
  useEffect(() => {
    if (!context) return
    const close = () => setContext(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('blur', close) }
  }, [context])
  if (!tabs.length) return null
  const scroll = (direction: number) => scroller.current?.scrollBy({ left: direction * 240, behavior: 'smooth' })
  return <><div className="flex h-10 min-w-0 shrink-0 items-end border-b border-admin-outline bg-admin-bg/70">
    <button disabled={!canLeft} onClick={() => scroll(-1)} className="flex h-9 w-8 shrink-0 items-center justify-center border-r border-admin-outline bg-white text-admin-secondary disabled:opacity-25" title="Scroll tabs left"><ChevronLeft size={15}/></button>
    <div ref={scroller} onScroll={updateOverflow} onWheel={event => { if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); scroller.current?.scrollBy({ left: event.deltaY }); } }} className="flex min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map(tab => {
        const item = items.find(value => value.id === tab.itemId); if (!item) return null
        const active = activeId === item.id
        return <div key={item.id} data-tab-id={item.id} onContextMenu={event => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY, itemId: item.id }) }} onDragOver={event => { if (!draggingId) return; event.preventDefault(); if (draggingId !== item.id) setDropId(item.id) }} onDragLeave={() => setDropId(value => value === item.id ? null : value)} onDrop={event => { event.preventDefault(); const source = event.dataTransfer.getData('workspace-tab'); if (source && source !== item.id) onReorder(source, item.id); setDropId(null) }} onClick={() => { if (!draggingId) onSelect(item.id) }} className={`group relative flex h-9 min-w-[150px] max-w-[230px] shrink-0 cursor-default items-center gap-1 border-r border-admin-outline pl-1.5 pr-1 text-xs transition-[background-color,color,opacity,transform] duration-150 ${active ? 'bg-white font-bold text-uml-blue before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-uml-blue' : 'bg-admin-bg/40 text-admin-secondary hover:bg-white/70'} ${draggingId === item.id ? 'scale-[.98] opacity-40' : ''} ${dropId === item.id ? 'translate-x-1 after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-uml-blue' : ''}`} title={item.name}>
          <span draggable onDragStart={event => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('workspace-tab', item.id); setDraggingId(item.id) }} onDragEnd={() => { setDraggingId(null); setDropId(null) }} onClick={event => event.stopPropagation()} className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-admin-outline hover:bg-admin-bg active:cursor-grabbing" title="Hold and drag to reorder"><GripVertical size={14}/></span>
          <span className="flex min-w-0 flex-1 items-center gap-2 px-1 py-2">{item.kind === 'markdown' ? <FileText size={14} className="shrink-0"/> : <Workflow size={14} className="shrink-0"/>}<span className={`truncate ${tab.pinned ? '' : 'italic'}`}>{item.name}</span></span>
          <button type="button" draggable={false} onPointerDown={event => event.stopPropagation()} onClick={event => { event.preventDefault(); event.stopPropagation(); onClose(item.id) }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-admin-secondary hover:bg-red-50 hover:text-red-600" aria-label={`Close ${item.name}`}><X size={15}/></button>
        </div>
      })}
    </div>
    <button disabled={!canRight} onClick={() => scroll(1)} className="flex h-9 w-8 shrink-0 items-center justify-center border-l border-admin-outline bg-white text-admin-secondary disabled:opacity-25" title="Scroll tabs right"><ChevronRight size={15}/></button>
    <span className="flex h-9 min-w-8 shrink-0 items-center justify-center border-l border-admin-outline bg-white px-2 text-[10px] font-bold text-admin-secondary" title={`${tabs.length} open tabs`}>{tabs.length}</span>
  </div>
  {context && <div onPointerDown={event => event.stopPropagation()} className="fixed z-[240] w-52 rounded-lg border border-admin-outline bg-white p-1.5 text-xs shadow-[0_16px_45px_rgba(15,23,42,.2)]" style={{ left: Math.min(context.x, window.innerWidth - 220), top: Math.min(context.y, window.innerHeight - 220) }}>
    <TabMenuButton label="Close" onClick={() => { onClose(context.itemId); setContext(null) }}/>
    <TabMenuButton label="Close other tabs" disabled={tabs.length <= 1} onClick={() => { onCloseMany(tabs.filter(tab => tab.itemId !== context.itemId).map(tab => tab.itemId)); setContext(null) }}/>
    <div className="my-1 border-t border-admin-outline"/>
    <TabMenuButton label="Close tabs to the left" disabled={tabs.findIndex(tab => tab.itemId === context.itemId) <= 0} onClick={() => { const index = tabs.findIndex(tab => tab.itemId === context.itemId); onCloseMany(tabs.slice(0, index).map(tab => tab.itemId)); setContext(null) }}/>
    <TabMenuButton label="Close tabs to the right" disabled={tabs.findIndex(tab => tab.itemId === context.itemId) >= tabs.length - 1} onClick={() => { const index = tabs.findIndex(tab => tab.itemId === context.itemId); onCloseMany(tabs.slice(index + 1).map(tab => tab.itemId)); setContext(null) }}/>
    <div className="my-1 border-t border-admin-outline"/>
    <TabMenuButton label="Close all tabs" danger onClick={() => { onCloseMany(tabs.map(tab => tab.itemId)); setContext(null) }}/>
  </div>}
  </>
}

function TabMenuButton({ label, onClick, disabled = false, danger = false }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className={`block w-full rounded-md px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-admin-on-surface hover:bg-admin-bg'}`}>{label}</button>
}
