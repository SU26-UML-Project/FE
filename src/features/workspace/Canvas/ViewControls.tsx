import { useEffect, useState } from "react";
import { useT } from "../../../langue";

function I({ children, size = 14 }: { children: React.ReactNode; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    );
}

/* Compact round button inside the pill (smaller than a toolbar IconBtn). */
function PillBtn({ label, onClick, disabled, children }: {
    label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button title={label} aria-label={label} onClick={onClick} disabled={disabled}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary disabled:cursor-not-allowed disabled:opacity-35">
            {children}
        </button>
    );
}

/**
 * Floating view controls pinned to the canvas' bottom-left corner:
 * zoom-out · slider · zoom-in · % (click to reset) | fit | fullscreen.
 * Replaces both the old toolbar zoom widget and React Flow's default
 * <Controls>. The "canvas-view-controls" class is filtered out of PNG
 * exports (see exportPng in Editor.tsx).
 */
export function ViewControls(props: {
    zoom: number;
    minZoom: number;
    maxZoom: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onZoomChange: (zoom: number) => void;
    onFit: () => void;
    isFullscreen: boolean;
    onToggleFullscreen: () => void;
}) {
    const t = useT();

    // Zoom slider: a local "draft" keeps the thumb glued to the cursor while
    // dragging, and is cleared as soon as the real zoom (updated by React
    // Flow's onMove) catches up — so ± buttons, mouse wheel and Fit stay in
    // sync. (Moved here from the Toolbar when the widget relocated.)
    const [zoomDraft, setZoomDraft] = useState<number | null>(null);
    const displayZoom = Math.min(props.maxZoom, Math.max(props.minZoom, zoomDraft ?? props.zoom));
    const trackPct = ((displayZoom - props.minZoom) / (props.maxZoom - props.minZoom)) * 100;

    useEffect(() => {
        if (zoomDraft !== null && Math.abs(props.zoom - zoomDraft) < 0.005) setZoomDraft(null);
    }, [props.zoom, zoomDraft]);

    // Safety net: never let a stale draft freeze the slider (e.g. a missed onMove).
    useEffect(() => {
        if (zoomDraft === null) return;
        const timer = setTimeout(() => setZoomDraft(null), 250);
        return () => clearTimeout(timer);
    }, [zoomDraft]);

    return (
        <div className="canvas-view-controls absolute bottom-3 left-3 z-20 flex h-9 items-center gap-0.5 rounded-full border border-admin-outline/30 bg-white/90 pl-0.5 pr-1 shadow-[0_2px_10px_rgba(0,74,198,0.08)] backdrop-blur transition-colors focus-within:border-uml-blue/40 focus-within:ring-2 focus-within:ring-uml-blue/10">
            <PillBtn label={t("toolbar.zoomOut")} onClick={props.onZoomOut} disabled={displayZoom <= props.minZoom + 0.001}>
                <I><circle cx="11" cy="11" r="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
            </PillBtn>
            <input
                type="range"
                className="zoom-slider h-1 w-24 cursor-pointer"
                min={props.minZoom}
                max={props.maxZoom}
                step={0.01}
                value={displayZoom}
                title={t("toolbar.zoomSlider")}
                aria-label={t("toolbar.zoomLevel")}
                style={{ background: `linear-gradient(to right, var(--color-uml-blue) ${trackPct}%, var(--line-strong) ${trackPct}%)` }}
                onChange={(e) => {
                    const v = Number(e.target.value);
                    setZoomDraft(v);
                    props.onZoomChange(v);
                }}
                onDoubleClick={props.onZoomReset}
            />
            <PillBtn label={t("toolbar.zoomIn")} onClick={props.onZoomIn} disabled={displayZoom >= props.maxZoom - 0.001}>
                <I><circle cx="11" cy="11" r="7" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
            </PillBtn>
            <button onClick={props.onZoomReset} title={t("toolbar.zoomReset")}
                    className="flex h-7 min-w-[2.5rem] items-center justify-center rounded-full px-1 text-center text-[11.5px] font-bold tabular-nums text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
                {Math.round(displayZoom * 100)}%
            </button>

            <div className="mx-0.5 h-4 w-px shrink-0 bg-admin-outline/30" />

            <PillBtn label={t("toolbar.fit")} onClick={props.onFit}>
                <I><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></I>
            </PillBtn>
            <PillBtn
                label={props.isFullscreen ? t("toolbar.fullscreenExit") : t("toolbar.fullscreen")}
                onClick={props.onToggleFullscreen}
            >
                {props.isFullscreen ? (
                    <I><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="m14 10 7-7" /><path d="m3 21 7-7" /></I>
                ) : (
                    <I><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></I>
                )}
            </PillBtn>
        </div>
    );
}
