import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { DIAGRAMS } from "../../lib/diagrams";
import type { DiagramType } from "../../types";

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

function I({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
    const [menu, setMenu] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [importMenu, setImportMenu] = useState(false);
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
                    toast.success("Collaboration enabled! Link copied to clipboard.");
                }).catch(() => {
                    toast.error("Failed to copy link");
                });
            } else {
                toast.success("Collaboration disabled. Project is now private.");
            }
        }
    };

    useEffect(() => {
        if (!menu) return;
        const close = () => { setMenu(false); };
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [menu]);

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
                    <div className="text-[14px] font-bold tracking-tight text-admin-on-surface">Back to</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-admin-secondary">Dashboard</div>
                </div>
            </button>

            <Divider />

            {/* Active sheet name (what the user named their diagram) */}
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-admin-bg px-3 py-1.5 border border-admin-outline/30">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-admin-primary" />
                <span className="truncate text-[13px] font-bold text-admin-primary">{props.sheetName || "Untitled"}</span>
            </div>

            <button title="Keyboard shortcuts (?)" onClick={props.onHelp}
                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[14px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
                ?
            </button>
            <IconBtn label="Version history" active={props.versionHistoryOpen} onClick={props.onVersionHistory}>
                <I><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></I>
            </IconBtn>

            <div className="ml-auto flex items-center gap-1.5">
                <IconBtn label="Undo (Ctrl+Z)" onClick={props.onUndo} disabled={!props.canUndo}>
                    <I><path d="M9 14 4 9l5-5" /><path d="M4 9h11a6 6 0 0 1 0 12H8" /></I>
                </IconBtn>
                <IconBtn label="Redo (Ctrl+Shift+Z)" onClick={props.onRedo} disabled={!props.canRedo}>
                    <I><path d="m15 14 5-5-5-5" /><path d="M20 9H9a6 6 0 0 0 0 12h7" /></I>
                </IconBtn>

                <Divider />

                <IconBtn label="Zoom out" onClick={props.onZoomOut}>
                    <I><circle cx="11" cy="11" r="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
                </IconBtn>
                <button onClick={props.onZoomReset} className="min-w-[3rem] rounded-lg px-1 py-1 text-center text-[12px] font-bold tabular-nums text-admin-secondary hover:bg-admin-bg hover:text-admin-primary" title="Reset zoom to 100%">
                    {Math.round(props.zoom * 100)}%
                </button>
                <IconBtn label="Zoom in" onClick={props.onZoomIn}>
                    <I><circle cx="11" cy="11" r="7" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></I>
                </IconBtn>
                <IconBtn label="Fit to screen" onClick={props.onFit}>
                    <I><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></I>
                </IconBtn>
                <IconBtn label="Magic Layout (Auto-arrange)" onClick={props.onLayout}>
                    <I><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3v-3z" /><path d="M3 3l1.5 1.5" /><path d="M14 3l1 1" /><path d="M3 14l1 1" /></I>
                </IconBtn>

                <Divider />

                <IconBtn label="Toggle grid" active={props.showGrid} onClick={props.onToggleGrid}>
                    <I><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M3.5 9h17M3.5 15h17M9 3.5v17M15 3.5v17" /></I>
                </IconBtn>
                <IconBtn label="Toggle minimap" active={props.showMinimap} onClick={props.onToggleMinimap}>
                    <I><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><rect x="7" y="7" width="6" height="5" rx="1" /></I>
                </IconBtn>
                <IconBtn label="Snap to grid" active={props.snap} onClick={props.onToggleSnap}>
                    <I><path d="M6 4v8a6 6 0 0 0 12 0V4" /><rect x="4.5" y="3" width="3.5" height="4" rx="1" /><rect x="16" y="3" width="3.5" height="4" rx="1" /></I>
                </IconBtn>
                <IconBtn label={props.inspectorOpen ? "Hide properties" : "Show properties"} active={props.inspectorOpen} onClick={props.onToggleInspector}>
                    <I><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M14 4.5v15" /></I>
                </IconBtn>

                <Divider />

                <IconBtn label="Clear canvas" onClick={props.onClear}>
                    <I><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10 11v5M14 11v5" /></I>
                </IconBtn>

                {/* Import menu */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setImportMenu((v) => !v)} title="Import from file or code"
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-admin-outline/30 px-3 text-[12.5px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
                        <I size={15}><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></I>
                        Import
                    </button>
                    {importMenu && (
                        <div className="animate-pop absolute right-0 top-9 z-[140] w-44 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                            <MenuItem onClick={() => { fileRef.current?.click(); setImportMenu(false); }}>From file</MenuItem>
                            <MenuItem onClick={() => { props.onImportCode(); setImportMenu(false); }}>From code</MenuItem>
                        </div>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="application/json,.json,.mmd,.puml,.pu,.md,.txt" className="hidden"
                       onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onImportFile(f); e.target.value = ""; }} />

                {/* Collaboration Toggle (reusing publicAccess) */}
                <button
                    onClick={onShare}
                    disabled={sharing || !props.isOwner}
                    title={!props.isOwner ? "Only project owner can toggle collaboration" : props.isPublic ? "Disable collaboration & copy link" : "Enable collaboration (Max 4 members) & copy link"}
                    className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-[12.5px] font-bold transition-all duration-300 ${
                        props.isPublic
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                            : "border-admin-outline/30 text-admin-secondary hover:bg-admin-bg hover:text-admin-primary"
                    } ${!props.isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {sharing ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${props.isPublic ? 'bg-emerald-500 animate-pulse' : 'bg-admin-secondary/40'}`} />
                            <I size={15}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </I>
                        </div>
                    )}
                    <span className="flex items-center gap-1">
            {props.isPublic ? 'Online' : 'Offline'}
                        <span className={`ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] ${
                            props.isPublic ? 'bg-emerald-200/50 text-emerald-800' : 'bg-admin-bg text-admin-secondary'
                        }`}>
              4
            </span>
          </span>
                </button>

                {/* Export menu */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMenu((m) => !m)}
                            className="flex h-8 items-center gap-1.5 rounded-lg bg-admin-primary px-3 text-[12.5px] font-bold text-white transition-colors hover:bg-blue-700 shadow-sm">
                        <I size={15}><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 5h14" /></I>
                        Export
                    </button>
                    {menu && (
                        <div className="animate-pop absolute right-0 top-9 z-[140] w-48 overflow-hidden rounded-xl border border-admin-outline/30 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                            <MenuItem onClick={() => { props.onExportPng(); setMenu(false); }}>PNG image</MenuItem>
                            <MenuItem onClick={() => { props.onExportJson(); setMenu(false); }}>JSON file</MenuItem>
                            <div className="mx-3 my-1 border-t border-zinc-100" />
                            <MenuItem onClick={() => { props.onExportCode(); setMenu(false); }}>Mermaid / PlantUML code</MenuItem>
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

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} className="block w-full px-3.5 py-2 text-left text-[13px] text-admin-on-surface font-medium transition-colors hover:bg-admin-bg hover:text-admin-primary">
            {children}
        </button>
    );
}
