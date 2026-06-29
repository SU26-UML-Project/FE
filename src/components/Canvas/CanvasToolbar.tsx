import { useState, useEffect } from 'react'
import { useStore } from 'zustand'
import { useEditableName } from '../../hooks/useEditableName'
import { useCanvasStore } from '../../stores/canvasStore'
import { DIAGRAMS } from '../../utils/diagrams'

interface CanvasToolbarProps {
  diagramName: string
  onNameChange: (name: string) => void
  onBack: () => void
  onToggleCode: () => void
  onToggleProps: () => void
  onLayout: () => void
  isCodePanelOpen: boolean
  isPropsPanelOpen: boolean
  isLocked?: boolean
  onExportPng?: () => void
  onExportXml?: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  showGrid: boolean
  onToggleGrid: () => void
  showMinimap: boolean
  onToggleMinimap: () => void
  snap: boolean
  onToggleSnap: () => void
  onHelp: () => void
}

const CanvasToolbar = ({
  diagramName,
  onNameChange,
  onBack,
  onToggleProps,
  onLayout,
  isPropsPanelOpen,
  onExportPng,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showGrid,
  onToggleGrid,
  showMinimap,
  onToggleMinimap,
  snap,
  onToggleSnap,
  onHelp,
}: CanvasToolbarProps) => {
  const {
    isEditing,
    editName,
    inputRef,
    setEditName,
    startEditing,
    handleSubmitName,
    handleKeyDown,
  } = useEditableName(diagramName, onNameChange)

  const { clearCanvas, diagramType } = useCanvasStore()
  const { undo, redo, pastStates, futureStates } = useStore(useCanvasStore.temporal, (state) => state)
  const [exportMenu, setExportMenu] = useState(false)

  useEffect(() => {
    if (!exportMenu) return
    const close = () => setExportMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [exportMenu])

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-3">
      {/* Back & Brand */}
      <div className="flex items-center gap-2.5 pl-1 pr-2">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          title="Back to dashboard"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <path d="M10 6.5h4a3 3 0 0 1 3 3V14" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-zinc-900">
            DiaUML
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
            Studio
          </div>
        </div>
      </div>

      <Divider />

      {/* Diagram Name & Type Indicator */}
      <div className="flex min-w-0 items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900" />
        <span className="truncate text-[13px] font-semibold text-zinc-800">
          {DIAGRAMS.find((d) => d.id === diagramType)?.name ?? "Diagram"}
        </span>
      </div>

      <button
        title="Keyboard shortcuts (?)"
        onClick={onHelp}
        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        ?
      </button>

      <span className="text-zinc-300">/</span>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={handleSubmitName}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-[13px] font-semibold text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      ) : (
        <button
          onClick={startEditing}
          className="group flex items-center gap-1.5 hover:bg-zinc-50 px-2 py-1 rounded-md transition-colors"
        >
          <span className="text-[13px] font-semibold text-zinc-900">{diagramName}</span>
          <svg className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <IconBtn label="Undo (Ctrl+Z)" onClick={undo} disabled={pastStates.length <= 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h11a6 6 0 0 1 0 12H8" />
          </svg>
        </IconBtn>
        <IconBtn label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={futureStates.length <= 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9a6 6 0 0 0 0 12h7" />
          </svg>
        </IconBtn>

        <Divider />

        <IconBtn label="Zoom out" onClick={onZoomOut}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </IconBtn>
        <button
          onClick={onZoomReset}
          className="min-w-[3rem] rounded-lg px-1 py-1 text-center text-[12px] font-medium tabular-nums text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          title="Reset zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconBtn label="Zoom in" onClick={onZoomIn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </IconBtn>
        <IconBtn label="Fit to screen" onClick={onLayout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9V4h5" />
            <path d="M20 9V4h-5" />
            <path d="M4 15v5h5" />
            <path d="M20 15v5h-5" />
          </svg>
        </IconBtn>

        <Divider />

        <IconBtn label="Toggle grid" active={showGrid} onClick={onToggleGrid}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
            <path d="M3.5 9h17M3.5 15h17M9 3.5v17M15 3.5v17" />
          </svg>
        </IconBtn>
        <IconBtn label="Toggle minimap" active={showMinimap} onClick={onToggleMinimap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
            <rect x="7" y="7" width="6" height="5" rx="1" />
          </svg>
        </IconBtn>
        <IconBtn label="Snap to grid" active={snap} onClick={onToggleSnap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4v8a6 6 0 0 0 12 0V4" />
            <rect x="4.5" y="3" width="3.5" height="4" rx="1" />
            <rect x="16" y="3" width="3.5" height="4" rx="1" />
          </svg>
        </IconBtn>
        <IconBtn
          label={isPropsPanelOpen ? "Hide properties" : "Show properties"}
          active={isPropsPanelOpen}
          onClick={onToggleProps}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <path d="M14 4.5v15" />
          </svg>
        </IconBtn>

        <Divider />

        <IconBtn label="Clear canvas" onClick={clearCanvas}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16" />
            <path d="M9 7V5h6v2" />
            <path d="M6.5 7l1 13h9l1-13" />
            <path d="M10 11v5M14 11v5" />
          </svg>
        </IconBtn>

        {/* Export menu */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setExportMenu((m) => !m)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-zinc-800"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11" />
              <path d="m8 11 4 4 4-4" />
              <path d="M5 19h14" />
            </svg>
            Export
          </button>
          {exportMenu && (
            <div className="animate-pop absolute right-0 top-9 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <button
                onClick={() => { onExportPng?.(); setExportMenu(false); }}
                className="block w-full px-3.5 py-2 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                PNG image
              </button>
              <button
                className="block w-full px-3.5 py-2 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                JSON file
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-zinc-200" />
}

function IconBtn({ label, onClick, active, disabled, children }: any) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  )
}

export default CanvasToolbar
