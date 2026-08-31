import { cn } from "../lib/cn";

/**
 * Skeleton building blocks — the app-wide replacement for spinner-based
 * "loading" states. Skeletons mirror the shape of the incoming content so
 * layout doesn't jump when data arrives.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div aria-hidden className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full", lineClassName)}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen neutral skeleton shown while the auth/session gate resolves
 * (App bootstrap & ProtectedRoute). Mimics a generic app shell: top bar +
 * hero-like content, so the hand-off to the real page feels seamless.
 */
export function SkeletonSplash() {
  return (
    <div aria-hidden className="flex h-screen flex-col bg-admin-bg">
      {/* Fake top bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-admin-outline/50 bg-white px-6 lg:px-12">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <div className="flex items-center gap-5">
          <Skeleton className="hidden h-4 w-20 md:block" />
          <Skeleton className="hidden h-4 w-20 md:block" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      {/* Fake hero */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center gap-10 px-6 py-12">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-4/5 rounded-lg" />
          <Skeleton className="h-10 w-3/5 rounded-lg" />
          <SkeletonText lines={3} className="max-w-xl pt-3" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-12 w-44 rounded-lg" />
            <Skeleton className="h-12 w-44 rounded-lg" />
          </div>
        </div>
        <Skeleton className="hidden h-72 flex-1 rounded-3xl lg:block" />
      </div>
    </div>
  );
}
