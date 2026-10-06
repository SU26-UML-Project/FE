import { toast as hot } from "react-hot-toast";

/** Mirror of react-hot-toast's own message type (element | string | null | resolver fn). */
type Message = Parameters<typeof hot.success>[0];

/**
 * App-wide toast wrapper around react-hot-toast.
 *
 * Every string notification is rendered with a small × button so users can
 * dismiss it instantly instead of waiting for the auto-dismiss timer (or
 * having it cover the UI). Non-string messages (custom JSX) and promise /
 * custom toasts pass through untouched.
 */
function withCloseButton(message: Message, id: string): Message {
    if (typeof message !== "string") return message;
    return (
        <span className="flex min-w-0 items-start gap-2">
            <span className="min-w-0 break-words leading-snug">{message}</span>
            <button
                aria-label="Dismiss notification"
                title="Dismiss"
                onClick={(e) => {
                    e.stopPropagation();
                    hot.dismiss(id);
                }}
                className="-mr-1.5 -mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-200/70 hover:text-zinc-950"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                </svg>
            </button>
        </span>
    );
}

type Opts = Parameters<typeof hot.success>[1];

function show(kind: "success" | "error" | "loading", message: Message, opts?: Opts) {
    const id = opts?.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const content = withCloseButton(message, id);
    if (kind === "success") return hot.success(content, { ...opts, id });
    if (kind === "error") return hot.error(content, { ...opts, id });
    return hot.loading(content, { ...opts, id });
}

/** Drop-in replacement for react-hot-toast's `toast`, with a close button. */
export const toast = {
    success: (message: Message, opts?: Opts) => show("success", message, opts),
    error: (message: Message, opts?: Opts) => show("error", message, opts),
    loading: (message: Message, opts?: Opts) => show("loading", message, opts),
    custom: hot.custom,
    dismiss: hot.dismiss,
    remove: hot.remove,
    promise: hot.promise,
};

export default toast;