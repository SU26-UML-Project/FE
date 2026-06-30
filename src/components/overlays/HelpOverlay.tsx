function Row({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-[13px] text-zinc-600">{action}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((k, i) => (
          <kbd key={i} className="rounded-md border border-[var(--line-strong)] bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: { keys: string[]; action: string }[];
}) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
        {title}
      </p>
      <div className="divide-y divide-[var(--line)]">
        {rows.map((r, i) => (
          <Row key={i} {...r} />
        ))}
      </div>
    </div>
  );
}

export function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">Keyboard shortcuts</h2>
            <p className="text-[12px] text-zinc-400">Move faster — everything is keyboard-driven.</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 px-5 py-5">
          <Section
            title="Editing"
            rows={[
              { keys: ["Double-click"], action: "Rename node / label" },
              { keys: ["Del"], action: "Delete selection" },
              { keys: ["⌘/Ctrl", "D"], action: "Duplicate" },
              { keys: ["⌘/Ctrl", "C"], action: "Copy" },
              { keys: ["⌘/Ctrl", "V"], action: "Paste" },
              { keys: ["↑", "↓", "←", "→"], action: "Nudge (Shift = 10px)" },
            ]}
          />
          <Section
            title="Canvas"
            rows={[
              { keys: ["Drag"], action: "Select area" },
              { keys: ["Double-click"], action: "Quick add shape" },
              { keys: ["Space", "+ drag"], action: "Pan" },
              { keys: ["Scroll"], action: "Pan" },
              { keys: ["⌘/Ctrl", "Scroll"], action: "Zoom" },
              { keys: ["⌘/Ctrl", "A"], action: "Select all" },
            ]}
          />
          <Section
            title="History & view"
            rows={[
              { keys: ["⌘/Ctrl", "Z"], action: "Undo" },
              { keys: ["⌘/Ctrl", "Shift", "Z"], action: "Redo" },
              { keys: ["Right-click"], action: "Context menu" },
              { keys: ["Esc"], action: "Clear selection" },
            ]}
          />
          <Section
            title="Tips"
            rows={[
              { keys: ["Q"], action: "Switch diagram type (then 1–6)" },
              { keys: ["Drag handle"], action: "Connect nodes" },
              { keys: ["Drag corner"], action: "Resize shape" },
              { keys: ["Shift"], action: "Add to selection" },
              { keys: ["?"], action: "This help" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
