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

export default function App() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const navigate = (id: SectionId) => setSection(id);

  return (
    <div className="flex min-h-screen justify-center bg-cream p-0 sm:p-4 lg:p-6">
      {/* Khung ứng dụng — viền đậm, bo góc lớn */}
      <div className="flex h-[100dvh] w-full max-w-[1600px] gap-3 rounded-[28px] border-[6px] border-ink bg-panel p-3 shadow-2xl sm:rounded-[36px] sm:border-[8px] sm:p-4 lg:gap-4 sm:h-[calc(100dvh-2rem)] lg:h-[calc(100dvh-3rem)]">
        {/* Icon rail */}
        <Sidebar active={section} onNavigate={navigate} />

        {/* Cột nội dung */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar active={section} onNavigate={navigate} />
          <main className="scroll-slim flex-1 overflow-y-auto pr-1 pb-4 pt-1">
            <div key={section} className="animate-fade-up">
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
    </div>
  );
}
