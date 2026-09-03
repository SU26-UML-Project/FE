import { useEffect, useRef, useState } from "react";
import { toast } from "../../../shared/lib/toast";
import type { DiagramType } from "../../../types";
import { useLangStore, useT } from "../../../langue";

function IconBtn({ label, onClick, active, disabled, children }: {
    label: string; onClick?: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode;
}) {
    return (
        <button title={label} aria-label={label} aria-pressed={active ?? undefined} onClick={onClick} disabled={disabled}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-uml-blue disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-uml-blue bg-uml-blue text-white shadow-sm" : "border-transparent text-admin-secondary hover:bg-admin-bg hover:text-admin-primary"}`}>
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
    onBackToDashboard: () => void;
    onHelp: (e?: MouseEvent<HTMLButtonElement>) => void;
    onVersionHistory: () => void;
    versionHistoryOpen?: boolean;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onFit: () => void;
    onLayout: () => void;
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
    /** Distinct users currently in the collab room (self included, from websocket presence). */
    collabCount?: number;
    onTogglePublic?: () => Promise<void>;
}) {
    const t = useT();
    const lang = useLangStore((s) => s.lang);
    const setLang = useLangStore((s) => s.setLang);
    const [menu, setMenu] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [importMenu, setImportMenu] = useState(false);
    const [moreMenu, setMoreMenu] = useState(false);
    // Language super-section inside the ⋯ menu (inline accordion).
    const [langOpen, setLangOpen] = useState(false);
    // Which side of the merged Import/Export control is expanded (hover/focus).
    const [hoverSide, setHoverSide] = useState<"import" | "export" | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

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

    // Same outside-click dismissal for the ⋯ More dropdown.
    useEffect(() => {
        if (!moreMenu) return;
        const close = () => { setMoreMenu(false); };
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [moreMenu]);

    return (
        <header role="toolbar" aria-label="Diagram editor toolbar" className="relative z-[120] flex h-14 w-full min-w-0 shrink-0 items-center gap-2 overflow-visible border-b border-[var(--line)] bg-white px-3">
            {/* Brand */}
            <button onClick={props.onBackToDashboard} aria-label={t("toolbar.backTo")} className="group flex shrink-0 items-center gap-2.5 pl-1 pr-2 hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-uml-blue rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-uml-blue text-white group-hover:bg-admin-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M19 12H5" />
                        <path d="m12 19-7-7 7-7" />
                    </svg>
                </div>
                <div className="leading-tight text-left">
                    <div className="text-[14px] font-bold tracking-tight text-admin-on-surface">{t("toolbar.backTo")}</div>
                    <div className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-admin-secondary lg:block">{t("toolbar.dashboard")}</div>
                </div>
            </button>

            <Divider />

            {/* Help — on the main strip where it's easy to spot (moved out of
                the ⋯ menu). The shortcut sheet springs out of this button. */}
            <button
                title={t("toolbar.shortcuts")}
                aria-label={t("toolbar.shortcuts")}
                onClick={(e) => props.onHelp(e)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-admin-outline/40 text-[14px] font-black text-admin-secondary transition-colors hover:border-uml-blue/40 hover:bg-uml-blue/5 hover:text-uml-blue focus-visible:outline-2 focus-visible:outline-uml-blue"
            >
                ?
            </button>

            <div className="ml-auto flex min-w-0 items-center gap-1.5" role="group" aria-label="Edit actions">
                <IconBtn label={t("toolbar.undo")} onClick={props.onUndo} disabled={!props.canUndo}>
                    <I><path d="M9 14 4 9l5-5" /><path d="M4 9h11a6 6 0 0 1 0 12H8" /></I>
                </IconBtn>
                <IconBtn label={t("toolbar.redo")} onClick={props.onRedo} disabled={!props.canRedo}>
                    <I><path d="m15 14 5-5-5-5" /><path d="M20 9H9a6 6 0 0 0 0 12h7" /></I>
                </IconBtn>

                <Divider />

                {/* Zoom widget moved to the canvas (bottom-left floating pill,
                    see Canvas/ViewControls.tsx) together with fullscreen. */}
                <div className="hidden items-center gap-1.5 sm:flex" role="group" aria-label="View options">
                <IconBtn label={t("toolbar.fit")} onClick={props.onFit}>
                    <I><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></I>
                </IconBtn>
                {/* Magic Layout — subtler chip that still pops: neutral violet chip
                    with a tiny gradient sparkle badge as the single accent. */}
                <button onClick={props.onLayout}
                        title={t("toolbar.magicTitle")}
                        aria-label={t("toolbar.magicTitle")}
                        className="group relative flex h-8 shrink-0 items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/70 pl-1.5 pr-2.5 text-[12.5px] font-bold text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-100/80 hover:shadow-[0_2px_12px_rgba(139,92,246,0.28)] active:scale-95 focus-visible:outline-2 focus-visible:outline-violet-500">
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
                </div>

                <Divider />

                {/* Clear canvas — soft-danger chip: clearly red without shouting */}
                <button onClick={props.onClear}
                        title={t("toolbar.clearTitle")}
                        aria-label={t("toolbar.clearTitle")}
                        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-100 hover:text-red-700 hover:shadow-[0_2px_10px_rgba(220,38,38,0.18)] active:scale-95 focus-visible:outline-2 focus-visible:outline-red-500">
                    <I size={15} className="transition-transform duration-200 group-hover:-rotate-12">
                        <path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10 11v5M14 11v5" />
                    </I>
                </button>

                {/* (Import moved into the merged Import/Export segmented control below) */}
                <input ref={fileRef} type="file" accept="application/json,.json,.mmd,.puml,.pu,.md,.txt" className="hidden"
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onImportFile(f); e.target.value = ""; }} />

                {/* Collaboration Toggle (reusing publicAccess) */}
                <button
                    onClick={onShare}
                    disabled={sharing || !props.isOwner}
                    title={!props.isOwner ? t("toolbar.ownerOnly") : props.isPublic ? t("toolbar.disableCollab") : t("toolbar.enableCollab")}
                    className={`group flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[12.5px] font-bold transition-all duration-300 md:px-3 ${
                        props.isPublic
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-[0_0_10px_rgba(220,38,38,0.1)]"
                            : "border-admin-outline/40 bg-admin-bg/60 text-admin-secondary hover:border-emerald-400/60 hover:bg-emerald-50 hover:text-emerald-700"
                    } ${!props.isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {sharing ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full transition-colors ${props.isPublic ? 'bg-emerald-500 animate-pulse group-hover:bg-red-500' : 'bg-zinc-400 group-hover:bg-emerald-500'}`} />
                            <I size={15}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </I>
                        </div>
                    )}
                    <span className="hidden items-center gap-1 md:flex">
                        {props.isPublic ? t('toolbar.online') : t('toolbar.offline')}
                        {props.isPublic && (
                            <span className={`ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] tabular-nums transition-colors ${
                                props.isPublic ? 'bg-emerald-200/60 text-emerald-800 group-hover:bg-red-100 group-hover:text-red-700' : ''
                            }`}>
                                {Math.max(1, props.collabCount ?? 1)}
                            </span>
                        )}
                    </span>
                </button>

                {/* Import / Export — merged segmented control. At rest it is two
                    compact icon buttons; hovering / keyboard-focusing / opening the
                    menu of ONE side expands exactly that side to its full label.
                    Touch devices (no hover): tap opens the menu directly — menu
                    items always carry full text. */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()} onMouseLeave={() => setHoverSide(null)}>
                    <div className="flex h-8 items-stretch overflow-hidden rounded-lg border border-admin-outline/40">
                        <button
                            onClick={() => { setImportMenu((v) => !v); setMenu(false); }}
                            onMouseEnter={() => setHoverSide("import")}
                            onFocus={() => setHoverSide("import")}
                            title={t("toolbar.importTitle")}
                            aria-label={t("toolbar.importTitle")}
                            aria-haspopup="menu"
                            aria-expanded={importMenu}
                            className={`flex h-8 items-center gap-1.5 px-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-uml-blue ${
                                importMenu
                                    ? "bg-admin-bg text-admin-primary"
                                    : "bg-white text-admin-secondary hover:bg-uml-blue/5 hover:text-uml-blue"
                            }`}
                        >
                            <I size={15}><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></I>
                            <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${hoverSide === "import" || importMenu ? "max-w-[96px] opacity-100" : "max-w-0 opacity-0"}`}>
                                {t("toolbar.import")}
                            </span>
                        </button>
                        <div className="w-px shrink-0 bg-admin-outline/30" />
                        <button
                            onClick={() => { setMenu((v) => !v); setImportMenu(false); }}
                            onMouseEnter={() => setHoverSide("export")}
                            onFocus={() => setHoverSide("export")}
                            title={t("toolbar.exportTitle")}
                            aria-label={t("toolbar.exportTitle")}
                            aria-haspopup="menu"
                            aria-expanded={menu}
                            className={`flex h-8 items-center gap-1.5 px-2.5 text-[12.5px] font-bold text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-uml-blue ${
                                menu ? "bg-admin-primary brightness-90" : "bg-admin-primary hover:brightness-90"
                            }`}
                        >
                            <I size={15}><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 5h14" /></I>
                            <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${hoverSide === "export" || menu ? "max-w-[96px] opacity-100" : "max-w-0 opacity-0"}`}>
                                {t("toolbar.export")}
                            </span>
                        </button>
                    </div>
                    {importMenu && (
                        <div role="menu" aria-label={t("toolbar.importTitle")} className="animate-pop absolute right-0 top-9 z-[140] w-48 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
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
                    {menu && (
                        <div role="menu" aria-label={t("toolbar.exportTitle")} className="animate-pop absolute right-0 top-9 z-[140] w-48 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
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

                {/* ⋯ More — low-frequency actions (History, Language, Shortcuts)
                    moved off the main strip so the toolbar fits 1024–1366px screens. */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMoreMenu((v) => !v)} title="More" aria-label="More options" aria-haspopup="menu" aria-expanded={moreMenu}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-uml-blue ${
                                moreMenu
                                    ? "border-uml-blue/40 bg-uml-blue/5 text-uml-blue"
                                    : "border-admin-outline/40 text-admin-secondary hover:border-uml-blue/40 hover:bg-uml-blue/5 hover:text-uml-blue"
                            }`}>
                        <I><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></I>
                    </button>
                    {moreMenu && (
                        <div role="menu" aria-label="More options" className="animate-pop absolute right-0 top-9 z-[140] w-56 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                            <MenuItem onClick={() => { props.onVersionHistory(); setMoreMenu(false); }}>
                                <span className="flex items-center gap-2.5">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${props.versionHistoryOpen ? "border-uml-blue/40 bg-uml-blue/10 text-uml-blue" : "border-admin-outline/30 bg-admin-bg text-admin-secondary"}`}>
                                        <I size={12}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></I>
                                    </span>
                                    {t("toolbar.history")}
                                    {props.versionHistoryOpen && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-uml-blue" />}
                                </span>
                            </MenuItem>
                            <div className="mx-3 my-1 border-t border-zinc-100" />
                            {/* Ngôn ngữ / Language — expanding super-section.
                                Picking an option switches language immediately but
                                keeps the menu OPEN so the change is visible. */}
                            <div>
                                <button onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-admin-on-surface transition-colors hover:bg-admin-bg hover:text-admin-primary">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-admin-outline/30 bg-admin-bg text-admin-secondary">
                                        <I size={12}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></I>
                                    </span>
                                    <span className="flex-1">{lang === "vi" ? "Ngôn ngữ" : "Language"}</span>
                                    <I size={13} className={`shrink-0 text-admin-secondary/50 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></I>
                                </button>
                                <div className={`grid transition-all duration-200 ease-out ${langOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                    <div className="overflow-hidden">
                                        <div className="relative mx-3.5 my-1.5 flex rounded-lg bg-admin-bg p-1 text-[12px] font-bold">
                                            {/* Sliding thumb — glides between the two options */}
                                            <span aria-hidden className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md bg-white shadow-sm transition-transform duration-200 ease-out ${lang === "en" ? "translate-x-full" : ""}`} />
                                            <button onClick={() => setLang("vi")} className={`relative z-10 flex-1 rounded-md py-1.5 text-center transition-colors ${lang === "vi" ? "text-admin-primary" : "text-admin-secondary hover:text-admin-on-surface"}`}>Tiếng Việt</button>
                                            <button onClick={() => setLang("en")} className={`relative z-10 flex-1 rounded-md py-1.5 text-center transition-colors ${lang === "en" ? "text-admin-primary" : "text-admin-secondary hover:text-admin-on-surface"}`}>English</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* (Export moved into the merged Import/Export segmented control above) */}
            </div>
        </header>
    );
}

function Divider() {
    return <div aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-admin-outline/30" />;
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button role="menuitem" onClick={onClick} className="block w-full px-3.5 py-2 text-left text-[13px] text-admin-on-surface font-medium transition-colors hover:bg-admin-bg hover:text-admin-primary focus-visible:bg-admin-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-uml-blue">
            {children}
        </button>
    );
}
