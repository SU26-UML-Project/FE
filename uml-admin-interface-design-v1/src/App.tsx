import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Dashboard from "@/sections/Dashboard";
import Users from "@/sections/Users";
import Projects from "@/sections/Projects";
import Intelligence from "@/sections/Intelligence";
import Operation from "@/sections/Operation";
import Subscriptions from "@/sections/Subscriptions";
import type { SectionId } from "@/data/mock";

const meta: Record<SectionId, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Tổng quan hệ thống UML" },
  users: { title: "Management", subtitle: "Quản lý người dùng" },
  projects: { title: "Management", subtitle: "Quản lý dự án toàn hệ thống" },
  intelligence: { title: "Intelligence", subtitle: "Cấu hình AI Engine · AnythingLLM" },
  operation: { title: "Operation", subtitle: "Mẫu Workspace & Knowledge" },
  subscription: { title: "Operation", subtitle: "Gói Subscription" },
};

function useCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebar.collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar.collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return { collapsed, toggle };
}

export default function App() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collapsed, toggle } = useCollapsed();

  const navigate = (id: SectionId) => {
    setSection(id);
    setSidebarOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] text-slate-900">
      <Sidebar
        active={section}
        onNavigate={navigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggle}
      />

      <div className={cnBase(collapsed)}>
        <Topbar
          title={meta[section].title}
          subtitle={meta[section].subtitle}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div key={section} className="mx-auto max-w-[1400px] animate-fade-up">
            {section === "dashboard" && <Dashboard />}
            {section === "users" && <Users />}
            {section === "projects" && <Projects />}
            {section === "intelligence" && <Intelligence />}
            {section === "operation" && <Operation />}
            {section === "subscription" && <Subscriptions />}
          </div>
        </main>
      </div>
    </div>
  );
}

function cnBase(collapsed: boolean) {
  return [
    "relative transition-[padding] duration-300",
    collapsed ? "lg:pl-[72px]" : "lg:pl-[256px]",
  ].join(" ");
}
