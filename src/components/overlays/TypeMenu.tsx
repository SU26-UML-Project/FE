import { useEffect } from "react";
import type { DiagramType } from "../../types";
import { DIAGRAMS } from "../../lib/diagrams";

/** Quick diagram-type switcher (open with the "Q" key, pick with 1–6). */
export function TypeMenu({
  current,
  onPick,
  onClose,
}: {
  current: DiagramType;
  onPick: (id: DiagramType) => void;
  onClose: () => void;
}) {
  // Keyboard handling WHILE the menu is open: Esc closes, 1–6 pick a type.
  // (Toggling open/close on "Q" is handled solely by the parent's global
  // listener so there is never a clash between two listeners.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const dt = DIAGRAMS[Number(e.key) - 1];
        if (dt) onPick(dt.id as DiagramType);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPick]);

  return (
    <div
      className="fixed inset-0 z-[75] flex items-start justify-center bg-black/20 pt-[18vh] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-zinc-900">Switch diagram type</h2>
            <p className="text-[11.5px] text-zinc-400">Pick a type — palette & connectors change instantly</p>
          </div>
          <kbd className="rounded-md border border-[var(--line-strong)] bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-500">1–6</kbd>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-3">
          {DIAGRAMS.map((d, i) => {
            const active = d.id === current;
            return (
              <button
                key={d.id}
                onClick={() => onPick(d.id as DiagramType)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${active ? "border-zinc-900 bg-zinc-50" : "border-[var(--line)] hover:border-zinc-300 hover:bg-zinc-50"}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-zinc-900">{d.name}</span>
                  <span className="block truncate text-[11px] text-zinc-400">{d.hint}</span>
                </span>
                {active && (
                  <svg className="h-4 w-4 shrink-0 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-1.5 border-t border-[var(--line)] px-3 py-2 text-[11px] text-zinc-400">
          <span>Press</span>
          <kbd className="rounded border border-[var(--line)] bg-zinc-50 px-1.5 py-0.5 font-mono">Q</kbd>
          <span>or</span>
          <kbd className="rounded border border-[var(--line)] bg-zinc-50 px-1.5 py-0.5 font-mono">Esc</kbd>
          <span>to close</span>
        </div>
      </div>
    </div>
  );
}
