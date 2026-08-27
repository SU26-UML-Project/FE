function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-center">
            <div className="text-[20px] font-semibold tabular-nums text-zinc-900">{value}</div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
        </div>
    );
}

function Hint({ shortcut, description }: { shortcut: string; description: string }) {
    return (
        <div className="flex items-center gap-2 text-[12px]">
            <span className="shrink-0 rounded-md border border-[var(--line)] bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-600">
                {shortcut}
            </span>
            <span className="text-zinc-500">{description}</span>
        </div>
    );
}

function InspectorStatus({
    nodesLen,
    edgesLen,
    activeConnectorName,
}: {
    nodesLen: number;
    edgesLen: number;
    activeConnectorName: string;
}) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
                <Stat label="Nodes" value={nodesLen} />
                <Stat label="Edges" value={edgesLen} />
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Active connector
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-zinc-800">
                    {activeConnectorName}
                </div>
            </div>

            <div className="space-y-2.5">
                <Hint shortcut="Drag" description="select an area" />
                <Hint shortcut="Space + drag" description="pan the canvas" />
                <Hint shortcut="Scroll" description="pan - Cmd/Ctrl+scroll to zoom" />
                <Hint shortcut="Double-click" description="rename a node" />
                <Hint shortcut="Drag handle" description="connect two nodes" />
                <Hint shortcut="Delete" description="remove selection" />
            </div>
        </div>
    );
}

export function Inspector({
    nodesLen,
    edgesLen,
    activeConnectorName,
    onClose,
}: {
    nodesLen: number;
    edgesLen: number;
    activeConnectorName: string;
    onClose: () => void;
}) {
    return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-admin-outline/30 bg-admin-bg/30">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-admin-outline/30 pl-4 pr-2">
                <span className="text-[13px] font-bold text-admin-on-surface">Properties</span>
                <button
                    title="Hide panel"
                    onClick={onClose}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-admin-secondary/50 transition-colors hover:bg-admin-surface hover:text-admin-on-surface"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4">
                <InspectorStatus
                    nodesLen={nodesLen}
                    edgesLen={edgesLen}
                    activeConnectorName={activeConnectorName}
                />
            </div>
        </aside>
    );
}