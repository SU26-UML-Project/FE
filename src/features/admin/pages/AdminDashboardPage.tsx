import { useState } from "react";
import Topbar from "../components/Header";
import Sidebar from "../components/Sidebar";
import DashboardSection from "../components/sections/Dashboard";
import UsersSection from "../components/sections/Users";
import ProjectsSection from "../components/sections/Projects";
import IntelligenceSection from "../components/sections/Intelligence";
import SubscriptionsSection from "../components/sections/Subscriptions";
import AuditLogSection from "../components/sections/AuditLog";
import { useAuthStore } from "../../auth/model/useAuthStore";
import type { SectionId } from "../components/data";

const meta: Record<SectionId, { title: string; subtitle: string }> = {
  dashboard: { title: "Bảng điều khiển", subtitle: "Tổng quan hệ thống UML" },
  users: { title: "Quản lý", subtitle: "Quản lý người dùng" },
  projects: { title: "Quản lý", subtitle: "Quản lý dự án toàn hệ thống" },
  intelligence: { title: "Trí tuệ nhân tạo", subtitle: "Cấu hình AI Engine · AnythingLLM" },

  subscription: { title: "Vận hành", subtitle: "Gói Subscription" },
  audit: { title: "Hệ thống", subtitle: "Nhật ký thao tác quản trị" },
};

function useCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar.collapsed") === "1"; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("sidebar.collapsed", next ? "1" : "0"); } catch { /* */ }
      return next;
    });
  };
  return { collapsed, toggle };
}

export default function AdminDashboard() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed, toggle } = useCollapsed();
  const user = useAuthStore((s) => s.user);

  const navigate = (id: SectionId) => {
    setSection(id);
    setSidebarOpen(false);
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#fafafa] text-slate-900 font-sans">
      <Sidebar
        active={section}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggle}
        user={user}
      />

      <div className={cnBase(collapsed)}>
        <Topbar
          title={meta[section].title}
          subtitle={meta[section].subtitle}
          onOpenSidebar={() => setSidebarOpen(true)}
          user={user}
        />
        <main className="flex-1 overflow-hidden px-4 pb-4 pt-3 sm:px-6 lg:px-8">
          <div key={section} className="mx-auto flex h-full max-w-[1400px] animate-fade-up flex-col overflow-hidden">
            {section === "dashboard" && <DashboardSection />}
            {section === "users" && <UsersSection />}
            {section === "projects" && <ProjectsSection />}
            {section === "intelligence" && <IntelligenceSection />}
            {section === "subscription" && <SubscriptionsSection />}
            {section === "audit" && <AuditLogSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

function cnBase(collapsed: boolean) {
  return [
    "relative flex flex-1 flex-col overflow-hidden transition-[padding] duration-300",
    collapsed ? "lg:pl-[72px]" : "lg:pl-[256px]",
  ].join(" ");
}
