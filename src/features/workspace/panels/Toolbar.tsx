import { useEffect, useRef, useState } from "react";
import { toast } from "../../../shared/lib/toast";
import type { DiagramType } from "../../../types";
import { useT } from "../../../langue";
import { LanguageSwitcher } from "../../../shared/ui/LanguageSwitcher";

function IconBtn({ label, onClick, active, disabled, children }: {
    label: string; onClick?: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button title={label} onClick={onClick} disabled={disabled}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-uml-blue bg-uml-blue text-white shadow-sm" : "border-transparent text-admin-secondary hover:bg-admin-bg hover:text-admin-primary"}`}>
            {children}
        </button>
    );
}

function I({ children, size = 16, className }: { children: React.ReactNode; size?: number; className?: string }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    );
}

export function Toolbar(props: {
    diagramType: DiagramType;
    sheetName: string;
    onBackToDashboard: () => void;
    onHelp: () => void;
    onVersionHistory: () => void;
    versionHistoryOpen?: boolean;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onFit: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    /** Set zoom directly (scale factor) — used by the zoom slider. */
    onZoomChange: (zoom: number) => void;
    /** Keep in sync with <ReactFlow minZoom / maxZoom> in Editor.tsx. */
    minZoom?: number;
    maxZoom?: number;
    onLayout: () => void;
    zoom: number;
    showGrid: boolean;
    onToggleGrid: () => void;
    showMinimap: boolean;
    onToggleMinimap: () => void;
    snap: boolean;
    onToggleSnap: () => void;
    inspectorOpen: boolean;
    onToggleInspector: () => void;
    onClear: () => void;
    onExportPng: () => void;
    onExportJson: () => void;
    onExportCode: () => void;
    onImportCode: () => void;
    onImportFile: (file: File) => void;
    saved?: boolean;
    projectId?: string;
    isPublic?: boolean;
    isOwner?: boolean;
    onTogglePublic?: () => Promise<void>;
}) {
    const t = useT();
    const [menu, setMenu] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [importMenu, setImportMenu] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Zoom slider: a local "draft" keeps the thumb glued to the cursor while
    // dragging, and is cleared as soon as the real zoom (updated by React Flow's
    // onMove) catches up — so ± buttons, mouse wheel and Fit all stay in sync.
    const zoomMin = props.minZoom ?? 0.2;
    const zoomMax = props.maxZoom ?? 3;
    const [zoomDraft, setZoomDraft] = useState<number | null>(null);
    const displayZoom = Math.min(zoomMax, Math.max(zoomMin, zoomDraft ?? props.zoom));
    const trackPct = ((displayZoom - zoomMin) / (zoomMax - zoomMin)) * 100;

    useEffect(() => {
        if (zoomDraft !== null && Math.abs(props.zoom - zoomDraft) < 0.005) setZoomDraft(null);
    }, [props.zoom, zoomDraft]);

    // Safety net: never let a stale draft freeze the slider (e.g. a missed onMove).
    useEffect(() => {
        if (zoomDraft === null) return;
        const t = setTimeout(() => setZoomDraft(null), 250);
        return () => clearTimeout(t);
    }, [zoomDraft]);

    const onShare = async () => {
        if (props.onTogglePublic) {
            setSharing(true);
            await props.onTogglePublic();
            setSharing(false);

            // Chỉ copy link khi bật lên Online
            if (!props.isPublic) {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => {
                    toast.success(t("toolbar.toastCollabOn"));
                }).catch(() => {
                    toast.error(t("toolbar.toastCopyFail"));
                });
            } else {
                toast.success(t("toolbar.toastCollabOff"));
            }
        }
    };

    useEffect(() => {
        if (!menu) return;
        const close = () => { setMenu(false); };
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [menu]);

    // Clicking anywhere outside the toolbar closes the Import dropdown too.
    useEffect(() => {
        if (!importMenu) return;
        const close = () => { setImportMenu(false); };
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [importMenu]);

    return (
        <header className="relative z-[120] flex h-14 w-full min-w-0 shrink-0 items-center gap-3 overflow-visible border-b border-[var(--line)] bg-white px-3">
            {/* Brand */}
            <button onClick={props.onBackToDashboard} className="group flex items-center gap-2.5 pl-1 pr-2 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uml-blue text-white group-hover:bg-blue-700">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <path d="m12 19-7-7 7-7" />
                    </svg>
                </div>
                <div className="leading-tight text-left">
                    <div className="text-[14px] font-bold tracking-tight text-admin-on-surface">{t("toolbar.backTo")}</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-admin-secondary">{t("toolbar.dashboard")}</div>
                </div>
            </button>

            <Divider />

            {/* Active sheet name (what the user named their diagram) */}
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-admin-bg px-3 py-1.5 border border-admin-outline/30">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-admin-primary" />
                <span className="truncate text-[13px] font-bold text-admin-primary">{props.sheetName || t("toolbar.untitled")}</span>
            </div>

            <button title={t("toolbar.shortcuts")} onClick={props.onHelp}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
                ?
            </button>
            {/* Version history — labeled pill so the feature is discoverable; glows when open */}
            <button onClick={props.onVersionHistory}
                    title={t("toolbar.historyTitle")}
                    aria-pressed={props.versionHistoryOpen}
                    className={`group flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-bold transition-colors ${
                        props.versionHistoryOpen
                            ? "border-uml-blue/40 bg-uml-blue/10 text-uml-blue shadow-[0_0_10px_rgba(37,99,235,0.12)]"
                            : "border-admin-outline/40 text-admin-secondary hover:border-uml-blue/40 hover:bg-uml-blue/5 hover:text-uml-blue"
                    }`}>
                <I size={15} className="transition-transform duration-300 group-hover:-rotate-12">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
                </I>
                <span className="hidden md:inline">{t("toolbar.history")}</span>
            </button>

            {/* Language switcher (VI ⇄ EN) — mirrors the Navbar placement */}
            <LanguageSwitcher compact />

            <div className="ml-auto flex items-center gap-1.5">
                <IconBtn label={t("toolbar.undo")} onClick={props.onUndo} disabled={!props.canUndo}>
                    <I><path d="M9 14 4 9l5-5" /><path d="M4 9h11a6 6 0 0 1 0 12H8" /></I>
                </IconBtn>
                <IconBtn label={t("toolbar.redo")} onClick={props.onRedo} disabled={!props.canRedo}>
                    <I><path d="m15 14 5-5-5-5" /><path d="M20 9H9a6 6 0 0 0 0 12h7" /></I>
                </IconBtn>

                <Divider />

                {/* Zoom widget: − · drag slider · + · % (click % to reset) */}
                <div className="flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-admin-outline/30 bg-white pl-0.5 pr-1 shadow-sm transition-colors focus-within:border-uml-blue/40 focus-within:ring-2 focus-within:ring-uml-blue/10">
                    <ZoomBtn label={t("toolbar.zoomOut")} onClick={props.onZoomOut} disabled={displayZoom <= zoomMin + 0.001}>
                        <I size={14}><circle cx="11" cy="11" r="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
                    </ZoomBtn>
                    <input
                        type="range"
                        className="zoom-slider hidden h-1 w-20 cursor-pointer md:block lg:w-24"
                        min={zoomMin}
                        max={zoomMax}
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
                    <ZoomBtn label={t("toolbar.zoomIn")} onClick={props.onZoomIn} disabled={displayZoom >= zoomMax - 0.001}>
                        <I size={14}><circle cx="11" cy="11" r="7" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
                    </ZoomBtn>
                    <div className="mx-0.5 h-4 w-px shrink-0 bg-admin-outline/30" />
                    <button onClick={props.onZoomReset} title={t("toolbar.zoomReset")}
                            className="flex h-6 min-w-[2.75rem] items-center justify-center rounded-full px-1 text-center text-[11.5px] font-bold tabular-nums text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
                        {Math.round(displayZoom * 100)}%
                    </button>
                </div>
                <IconBtn label={t("toolbar.fit")} onClick={props.onFit}>
                    <I><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></I>
                </IconBtn>
                {/* Magic Layout — subtler chip that still pops: neutral violet chip
                    with a tiny gradient sparkle badge as the single accent. */}
                <button onClick={props.onLayout}
                        title={t("toolbar.magicTitle")}
                        className="group relative flex h-8 shrink-0 items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/70 pl-1.5 pr-2.5 text-[12.5px] font-bold text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-100/80 hover:shadow-[0_2px_12px_rgba(139,92,246,0.28)] active:scale-95">
                    {/* Accent: small gradient badge — the only "loud" element left */}
                    <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110">
                        <I size={11}>
                            <path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z" />
                        </I>
                    </span>
                    <span className="hidden xl:inline">{t("toolbar.magic")}</span>
                </button>

                <Divider />

                <IconBtn label={t("toolbar.grid")} active={props.showGrid} onClick={props.onToggleGrid}>
                    <I><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M3.5 9h17M3.5 15h17M9 3.5v17M15 3.5v17" /></I>
                </IconBtn>
                <IconBtn label={t("toolbar.minimap")} active={props.showMinimap} onClick={props.onToggleMinimap}>
                    <I><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><rect x="7" y="7" width="6" height="5" rx="1" /></I>
                </IconBtn>
                <IconBtn label={t("toolbar.snap")} active={props.snap} onClick={props.onToggleSnap}>
                    <I><path d="M6 4v8a6 6 0 0 0 12 0V4" /><rect x="4.5" y="3" width="3.5" height="4" rx="1" /><rect x="16" y="3" width="3.5" height="4" rx="1" /></I>
                </IconBtn>
                <IconBtn label={props.inspectorOpen ? t("toolbar.hideProps") : t("toolbar.showProps")} active={props.inspectorOpen} onClick={props.onToggleInspector}>
                    <I><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M14 4.5v15" /></I>
                </IconBtn>

                <Divider />

                {/* Clear canvas — soft-danger chip: clearly red without shouting */}
                <button onClick={props.onClear}
                        title={t("toolbar.clearTitle")}
                        className="group flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-2.5 text-[12.5px] font-bold text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-100 hover:text-red-700 hover:shadow-[0_2px_10px_rgba(220,38,38,0.18)] active:scale-95">
                    <I size={15} className="transition-transform duration-200 group-hover:-rotate-12">
                        <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10 11v5M14 11v5" />
                    </I>
                    <span className="hidden xl:inline">{t("toolbar.clear")}</span>
                </button>

                {/* Import menu */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setImportMenu((v) => !v)} title={t("toolbar.importTitle")} aria-expanded={importMenu}
                            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-bold transition-colors ${
                                importMenu
                                    ? "border-uml-blue/40 bg-uml-blue/5 text-uml-blue"
                                    : "border-admin-outline/40 text-admin-secondary hover:border-uml-blue/40 hover:bg-uml-blue/5 hover:text-uml-blue"
                            }`}>
                        <I size={15}><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></I>
                        {t("toolbar.import")}
                        <I size={12} className={`opacity-60 transition-transform duration-200 ${importMenu ? "rotate-180" : ""}`}>
                            <path d="m6 9 6 6 6-6" />
                        </I>
                    </button>
                    {importMenu && (
                        <div className="animate-pop absolute right-0 top-9 z-[140] w-48 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                            <MenuItem onClick={() => { fileRef.current?.click(); setImportMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /></I>
                                    </span>
                                    {t("toolbar.fromFile")}
                                </span>
                            </MenuItem>
                            <MenuItem onClick={() => { props.onImportCode(); setImportMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></I>
                                    </span>
                                    {t("toolbar.fromCode")}
                                </span>
                            </MenuItem>
                        </div>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="application/json,.json,.mmd,.puml,.pu,.md,.txt" className="hidden"
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onImportFile(f); e.target.value = ""; }} />

                {/* Collaboration Toggle (reusing publicAccess) */}
                <button
                    onClick={onShare}
                    disabled={sharing || !props.isOwner}
                    title={!props.isOwner ? t("toolbar.ownerOnly") : props.isPublic ? t("toolbar.disableCollab") : t("toolbar.enableCollab")}
                    className={`group flex h-8 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-bold transition-all duration-300 ${
                        props.isPublic
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_0_10px_rgba(220,38,38,0.1)]"
                            : "border-red-200 bg-red-50/70 text-red-600 hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-700"
                    } ${!props.isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {sharing ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full transition-colors ${props.isPublic ? 'bg-emerald-500 animate-pulse group-hover:bg-red-500' : 'bg-red-500 group-hover:bg-emerald-500'}`} />
                            <I size={15}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </I>
                        </div>
                    )}
                    <span className="flex items-center gap-1">
            {props.isPublic ? t('toolbar.online') : t('toolbar.offline')}
                        <span className={`ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] transition-colors ${
                            props.isPublic ? 'bg-emerald-200/50 text-emerald-800 group-hover:bg-red-100 group-hover:text-red-700' : 'bg-red-100/70 text-red-700 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                        }`}>
              4
            </span>
          </span>
                </button>

                {/* Export menu — same chip language as Import; handlers unchanged */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenu((m) => !m)} title={t("toolbar.exportTitle")} aria-expanded={menu}
                            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-bold text-white shadow-sm transition-all duration-200 active:scale-95 ${
                                menu ? "bg-blue-700" : "bg-admin-primary hover:bg-blue-700"
                            }`}>
                        <I size={15}><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 5h14" /></I>
                        {t("toolbar.export")}
                        <I size={12} className={`opacity-80 transition-transform duration-200 ${menu ? "rotate-180" : ""}`}>
                            <path d="m6 9 6 6 6-6" />
                        </I>
                    </button>
                    {menu && (
                        <div className="animate-pop absolute right-0 top-9 z-[140] w-48 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                            <MenuItem onClick={() => { props.onExportPng(); setMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></I>
                                    </span>
                                    {t("toolbar.png")}
                                </span>
                            </MenuItem>
                            <MenuItem onClick={() => { props.onExportJson(); setMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" /><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" /></I>
                                    </span>
                                    {t("toolbar.json")}
                                </span>
                            </MenuItem>
                            <div className="mx-3 my-1 border-t border-zinc-100" />
                            <MenuItem onClick={() => { props.onExportCode(); setMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></I>
                                    </span>
                                    {t("toolbar.code")}
                                </span>
                            </MenuItem>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function Divider() {
    return <div className="mx-1 h-6 w-px bg-admin-outline/30" />;
}

/* Compact round button used inside the zoom pill (smaller than IconBtn). */
function ZoomBtn({ label, onClick, disabled, children }: {
    label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button title={label} onClick={onClick} disabled={disabled}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary disabled:cursor-not-allowed disabled:opacity-35">
            {children}
        </button>
    );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} className="block w-full px-3.5 py-2 text-left text-[13px] text-admin-on-surface font-medium transition-colors hover:bg-admin-bg hover:text-admin-primary">
            {children}
        </button>
    );
}
