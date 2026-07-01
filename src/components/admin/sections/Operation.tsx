import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Check,
  Copy,
  Eye,
  FileText,
  LayoutTemplate,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  cloneTrend,
  templates as seedTemplates,
  topicMeta,
  type TemplateDoc,
  type TopicKey,
  type WorkspaceTemplate,
} from "../data";
import { AreaChart, HBar } from "../charts";
import { Badge, Card, Segmented, Skeleton } from "../ui";
import { cn } from "../../../utils/cn";

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {delta && (
          <Badge tone="emerald">
            <TrendingUp className="h-3 w-3" /> {delta}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="text-[12.5px] text-slate-500">{label}</p>
    </Card>
  );
}

/* ------------------------- Overview (Prebuilt analytics) ------------------------- */
function Overview({ list }: { list: WorkspaceTemplate[] }) {
  const totalAccess = list.reduce((s, t) => s + t.access, 0);
  const totalClones = list.reduce((s, t) => s + t.clones, 0);
  const conv = totalAccess ? Math.round((totalClones / totalAccess) * 100) : 0;
  const maxClones = Math.max(...list.map((t) => t.clones));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={LayoutTemplate} label="Mẫu workspace" value={String(list.length)} />
        <StatCard icon={Eye} label="Lượt truy cập" value={totalAccess.toLocaleString("vi-VN")} delta="+18%" />
        <StatCard icon={Copy} label="Lượt clone" value={totalClones.toLocaleString("vi-VN")} delta="+12%" />
        <StatCard icon={TrendingUp} label="Tỉ lệ chuyển đổi" value={`${conv}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Lượt clone theo thời gian</h3>
              <p className="text-[13px] text-slate-500">12 tháng gần nhất</p>
            </div>
            <Badge tone="emerald"><TrendingUp className="h-3 w-3" /> +24% YoY</Badge>
          </div>
          <AreaChart data={cloneTrend} color="#6366f1" />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <h3 className="text-[14px] font-semibold text-slate-900">Clone theo mẫu</h3>
          </div>
          <div className="space-y-3">
            {list
              .slice()
              .sort((a, b) => b.clones - a.clones)
              .map((t) => (
                <HBar key={t.id} label={t.name} value={t.clones} max={maxClones} color={topicMeta[t.topic].dot} />
              ))}
          </div>
        </Card>
      </div>

      {/* breakdown table */}
      <Card className="p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-slate-900">Chi tiết theo mẫu</h3>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-semibold">Mẫu</th>
                <th className="px-3 py-2 font-semibold">Chủ đề</th>
                <th className="px-3 py-2 text-right font-semibold">Truy cập</th>
                <th className="px-3 py-2 text-right font-semibold">Clone</th>
                <th className="px-3 py-2 text-right font-semibold">Chuyển đổi</th>
                <th className="px-3 py-2 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((t) => {
                const meta = topicMeta[t.topic];
                return (
                  <tr key={t.id} className="transition hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: meta.dot }}>
                          <meta.icon className="h-4 w-4" />
                        </span>
                        <span className="text-[13px] font-medium text-slate-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-slate-900">{t.access.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-slate-900">{t.clones.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-slate-600">{Math.round((t.clones / t.access) * 100)}%</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={t.status === "published" ? "emerald" : "slate"}>
                        {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------- Templates grid ------------------------- */
function TemplateCard({
  t,
  onOpen,
}: {
  t: WorkspaceTemplate;
  onOpen: () => void;
}) {
  const meta = topicMeta[t.topic];
  const Icon = meta.icon;
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-soft hover-lift hover:border-slate-300"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: meta.dot }}>
          <Icon className="h-5 w-5" />
        </span>
        <Badge tone={t.status === "published" ? "emerald" : "slate"}>
          {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
        </Badge>
      </div>
      <h4 className="mt-3 text-[15px] font-semibold text-slate-900">{t.name}</h4>
      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-slate-400">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} /> {meta.label}
      </span>
      <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-slate-500">{t.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{t.docs.length}</p>
          <p className="text-[10.5px] text-slate-400">tài liệu</p>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{t.access.toLocaleString("vi-VN")}</p>
          <p className="text-[10.5px] text-slate-400">lượt xem</p>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{t.clones}</p>
          <p className="text-[10.5px] text-slate-400">lượt clone</p>
        </div>
      </div>
    </button>
  );
}

/* ------------------------- Template detail ------------------------- */
function TemplateDetail({
  t,
  onBack,
  onUpdateDocs,
}: {
  t: WorkspaceTemplate;
  onBack: () => void;
  onUpdateDocs: (docs: TemplateDoc[]) => void;
}) {
  const meta = topicMeta[t.topic];
  const Icon = meta.icon;
  const [uploading, setUploading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [docName, setDocName] = useState("");

  const simulateUpload = () => {
    setUploading(true);
    const pending: TemplateDoc = {
      id: Date.now(),
      name: docName.trim() || `tai-lieu-${t.docs.length + 1}.pdf`,
      type: "PDF",
      size: "1,2 MB",
      status: "processing",
    };
    onUpdateDocs([...t.docs, pending]);
    setDocName("");
    setShowAdd(false);
    setTimeout(() => {
      onUpdateDocs(
        [...t.docs, pending].map((d) => (d.id === pending.id ? { ...d, status: "ready" } : d))
      );
      setUploading(false);
    }, 1600);
  };

  const removeDoc = (id: number) => onUpdateDocs(t.docs.filter((d) => d.id !== id));

  return (
    <div className="animate-fade-in space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </button>

      {/* header */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ backgroundColor: meta.dot }}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-slate-900">{t.name}</h2>
                <Badge tone={t.status === "published" ? "emerald" : "slate"}>
                  {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
              </div>
              <p className="text-[13px] text-slate-500">{t.description}</p>
            </div>
          </div>
          <div className="flex gap-4">
            {[
              { l: "Tài liệu", v: String(t.docs.length) },
              { l: "Lượt truy cập", v: t.access.toLocaleString("vi-VN") },
              { l: "Lượt clone", v: String(t.clones) },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-[17px] font-semibold text-slate-900">{s.v}</p>
                <p className="text-[11px] text-slate-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Documents */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Tài liệu của workspace</h3>
              <p className="text-[13px] text-slate-500">Các tài liệu sẽ được ingest & đánh chỉ mục cho RAG.</p>
            </div>
            <button onClick={() => setShowAdd((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
              <Upload className="h-4 w-4" /> Tải lên
            </button>
          </div>

          {showAdd && (
            <div className="mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[12.5px] font-medium text-slate-700">Tên tệp</label>
                <input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="VD: payment-gateway-spec.pdf"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <button onClick={simulateUpload} disabled={uploading} className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
              </button>
            </div>
          )}

          {/* dropzone */}
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Upload className="h-6 w-6" />
            <span className="text-[13px] font-medium">Kéo thả hoặc bấm để tải tài liệu lên</span>
            <span className="text-[11px]">PDF, DOCX, MD, CSV — tối đa 25MB</span>
          </button>

          {/* doc list */}
          <div className="mt-4 space-y-2">
            {t.docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {d.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-800">{d.name}</p>
                  <p className="text-[11px] text-slate-400">{d.size}</p>
                </div>
                <Badge tone="slate">{d.type}</Badge>
                <Badge tone={d.status === "ready" ? "emerald" : d.status === "processing" ? "amber" : "rose"}>
                  {d.status === "ready" ? "Sẵn sàng" : d.status === "processing" ? "Đang xử lý" : "Lỗi"}
                </Badge>
                <button onClick={() => removeDoc(d.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {t.docs.length === 0 && (
              <p className="py-6 text-center text-[13px] text-slate-400">Chưa có tài liệu nào. Tải lên để bắt đầu.</p>
            )}
          </div>
        </Card>

        {/* side: UML types + settings */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-slate-900">Loại UML đi kèm</h3>
            <div className="flex flex-wrap gap-2">
              {t.uml.map((u) => (
                <span key={u} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">
                  <Check className="h-3 w-3 text-emerald-600" /> {u}
                </span>
              ))}
              <button className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-[12px] text-slate-400 hover:border-slate-400 hover:text-slate-600">
                <Plus className="h-3 w-3" /> Thêm
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-slate-900">Hiển thị</h3>
            <div className="space-y-2.5">
              {[
                { l: "Công khai trên thư viện mẫu", on: true },
                { l: "Cho phép người dùng clone", on: true },
                { l: "Tự động tạo workspace AI", on: false },
              ].map((s) => (
                <label key={s.l} className="flex items-center justify-between text-[13px] text-slate-600">
                  {s.l}
                  <span className={cn("relative h-5 w-9 rounded-full transition", s.on ? "bg-slate-900" : "bg-slate-200")}>
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", s.on ? "left-[18px]" : "left-0.5")} />
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Templates grid view ------------------------- */
function Templates({
  list,
  onOpen,
  onCreate,
}: {
  list: WorkspaceTemplate[];
  onOpen: (id: number) => void;
  onCreate: () => void;
}) {
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <svg viewBox="0 0 120 120" className="h-28 w-28 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="15" y="15" width="90" height="90" rx="8" strokeDasharray="4 3" />
          <rect x="30" y="35" width="60" height="8" rx="2" />
          <rect x="30" y="52" width="40" height="6" rx="2" />
          <rect x="30" y="67" width="50" height="6" rx="2" />
          <rect x="30" y="82" width="35" height="6" rx="2" />
          <path d="M85 35h8" />
          <path d="M85 52h8" />
          <path d="M85 67h8" />
          <path d="M85 82h8" />
        </svg>
        <p className="text-[15px] font-medium text-slate-400">Chưa có mẫu workspace nào</p>
        <p className="text-[13px] text-slate-400 text-center max-w-sm">Tạo mẫu workspace đầu tiên để cung cấp sẵn các template UML có sẵn cho người dùng.</p>
        <button onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
          <Plus className="h-4 w-4" /> Tạo mẫu đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">Mẫu workspace theo chủ đề</h3>
          <p className="text-[13px] text-slate-500">Tạo sẵn workspace cho Banking, E-commerce, Social, Hospital.</p>
        </div>
        <button onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
          <Plus className="h-4 w-4" /> Tạo mẫu
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => (
          <TemplateCard key={t.id} t={t} onOpen={() => onOpen(t.id)} />
        ))}
        {/* create card */}
        <button
          onClick={onCreate}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
        >
          <Plus className="h-7 w-7" />
          <span className="text-[13px] font-medium">Tạo mẫu workspace</span>
        </button>
      </div>
    </div>
  );
}

export default function Operation() {
  const [tab, setTab] = useState<"overview" | "templates">("templates");
  const [list, setList] = useState<WorkspaceTemplate[]>(seedTemplates);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const selected = useMemo(
    () => list.find((t) => t.id === selectedId) ?? null,
    [list, selectedId]
  );

  const createTemplate = () => {
    const topics = Object.keys(topicMeta) as TopicKey[];
    const topic = topics[list.length % topics.length];
    const id = Date.now();
    setList((l) => [
      ...l,
      {
        id,
        name: `Mẫu ${topicMeta[topic].label} mới`,
        topic,
        description: "Mô tả workspace mẫu. Chỉnh sửa để thêm chi tiết nghiệp vụ.",
        docs: [],
        access: 0,
        clones: 0,
        status: "draft",
        uml: ["Use Case", "Class"],
        updated: "Vừa tạo",
      },
    ]);
    setSelectedId(id);
    setTab("templates");
  };

  const updateDocs = (templateId: number, docs: TemplateDoc[]) => {
    setList((l) => l.map((t) => (t.id === templateId ? { ...t, docs, updated: "Vừa xong" } : t)));
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-5 overflow-hidden">
        <Card className="p-5">
          <div className="animate-pulse space-y-5">
            <div className="flex gap-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-28 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <Skeleton className="mt-3 h-4 w-36" />
                  <Skeleton className="mt-1 h-3 w-24" />
                  <Skeleton className="mt-2 h-8 w-full" />
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    <Skeleton className="h-4 w-10 mx-auto" />
                    <Skeleton className="h-4 w-10 mx-auto" />
                    <Skeleton className="h-4 w-10 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
    <Card className="flex min-h-0 flex-col overflow-y-auto p-5">
      <div className="mb-5 flex items-center justify-between">
        <Segmented
          value={tab}
          onChange={(v) => { setTab(v); setSelectedId(null); }}
          options={[
            { id: "overview", label: "Tổng quan", icon: <BarChart3 className="h-4 w-4" /> },
            { id: "templates", label: "Workspace mẫu", icon: <Boxes className="h-4 w-4" /> },
          ]}
        />
      </div>

      {tab === "overview" && <Overview list={list} />}

      {tab === "templates" &&
        (selected ? (
          <TemplateDetail
            t={selected}
            onBack={() => setSelectedId(null)}
            onUpdateDocs={(docs) => updateDocs(selected.id, docs)}
          />
        ) : (
          <Templates list={list} onOpen={setSelectedId} onCreate={createTemplate} />
        ))}
    </Card>
    </div>
  );
}

