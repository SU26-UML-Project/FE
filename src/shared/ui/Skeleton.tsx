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
 * Full-screen neutral loader shown while the auth/session gate resolves
 * (App bootstrap & ProtectedRoute).
 *
 * Cố tình KHÔNG mô phỏng hình dạng của một trang cụ thể. Bản trước vẽ lại
 * "landing page" (thanh topbar giả + hero giả), nên mỗi lần load/F5 một trang
 * cần đăng nhập, người dùng thấy như app vừa load MỘT TRANG KHÁC trong suốt
 * thời gian chờ `/users/me`. Khi gate mở, chính trang hiện tại sẽ hiện skeleton
 * của nó (dashboard/editor/... đều đã có skeleton riêng).
 */
export function SkeletonSplash() {
  return (
    <div aria-hidden className="flex h-screen flex-col items-center justify-center gap-5 bg-admin-bg">
      <span className="text-xl font-extrabold tracking-tight text-black">DiaUML Studio</span>
      <Skeleton className="h-1.5 w-48 rounded-full" />
      <span className="text-xs font-medium text-admin-secondary">Đang tải…</span>
    </div>
  );
}
