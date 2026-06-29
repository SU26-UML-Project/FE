import { useMemo, useState } from "react";
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
} from "@/data/mock";
import { AreaChart, HBar } from "@/components/charts";
import { Badge, Button, Card, inputCls, PageHeader, Segmented } from "@/components/ui";
import { cn } from "@/utils/cn";

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
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-gray-600">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {delta && (
          <Badge tone="emerald">
            <TrendingUp className="h-3 w-3" /> {delta}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-[22px] font-bold tracking-tight text-ink">{value}</p>
      <p className="text-[12.5px] text-gray-500">{label}</p>
    </Card>
  );
}

/* ------------------------- Overview ------------------------- */
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
              <h3 className="text-[14px] font-bold text-ink">Lượt clone theo thời gian</h3>
              <p className="text-[13px] text-gray-500">12 tháng gần nhất</p>
            </div>
            <Badge tone="emerald"><TrendingUp className="h-3 w-3" /> +24% YoY</Badge>
          </div>
          <AreaChart data={cloneTrend} color="#e4a11b" />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <h3 className="text-[14px] font-bold text-ink">Clone theo mẫu</h3>
          </div>
          <div className="space-y-3">
            {list.slice().sort((a, b) => b.clones - a.clones).map((t) => (
              <HBar key={t.id} label={t.name} value={t.clones} max={maxClones} color={topicMeta[t.topic].dot} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-[14px] font-bold text-ink">Chi tiết theo mẫu</h3>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black/5 text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2 font-semibold">Mẫu</th>
                <th className="px-3 py-2 font-semibold">Chủ đề</th>
                <th className="px-3 py-2 text-right font-semibold">Truy cập</th>
                <th className="px-3 py-2 text-right font-semibold">Clone</th>
                <th className="px-3 py-2 text-right font-semibold">Chuyển đổi</th>
                <th className="px-3 py-2 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {list.map((t) => {
                const meta = topicMeta[t.topic];
                return (
                  <tr key={t.id} className="transition hover:bg-white/50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: meta.dot }}>
                          <meta.icon className="h-4 w-4" />
                        </span>
                        <span className="text-[13px] font-semibold text-ink">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-600">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} /> {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-bold text-ink">{t.access.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-bold text-ink">{t.clones.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-gray-600">{Math.round((t.clones / t.access) * 100)}%</td>
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

/* ------------------------- Template card ------------------------- */
function TemplateCard({ t, onOpen }: { t: WorkspaceTemplate; onOpen: () => void }) {
  const meta = topicMeta[t.topic];
  const Icon = meta.icon;
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-3xl border border-white/60 bg-white/70 p-5 text-left shadow-soft hover-lift"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: meta.dot }}>
          <Icon className="h-5 w-5" />
        </span>
        <Badge tone={t.status === "published" ? "emerald" : "slate"}>
          {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
        </Badge>
      </div>
      <h4 className="mt-3 text-[15px] font-bold text-ink">{t.name}</h4>
      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-gray-400">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.dot }} /> {meta.label}
      </span>
      <p className="mt-2 flex-1 text-[12.5px] leading-relaxed text-gray-500">{t.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-black/5 pt-3 text-center">
        <div>
          <p className="text-[15px] font-bold text-ink">{t.docs.length}</p>
          <p className="text-[10.5px] text-gray-400">tài liệu</p>
        </div>
        <div>
          <p className="text-[15px] font-bold text-ink">{t.access.toLocaleString("vi-VN")}</p>
          <p className="text-[10.5px] text-gray-400">lượt xem</p>
        </div>
        <div>
          <p className="text-[15px] font-bold text-ink">{t.clones}</p>
          <p className="text-[10.5px] text-gray-400">lượt clone</p>
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
      name: docName.trim() || `tai-lieu-${t.docs.length + 1}.md`,
      type: "MD",
      size: "1,2 KB",
      status: "processing",
    };
    onUpdateDocs([...t.docs, pending]);
    setDocName("");
    setShowAdd(false);
    setTimeout(() => {
      onUpdateDocs([...t.docs, pending].map((d) => (d.id === pending.id ? { ...d, status: "ready" } : d)));
      setUploading(false);
    }, 1600);
  };

  const removeDoc = (id: number) => onUpdateDocs(t.docs.filter((d) => d.id !== id));

  return (
    <div className="animate-fade-in space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </button>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: meta.dot }}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-ink">{t.name}</h2>
                <Badge tone={t.status === "published" ? "emerald" : "slate"}>
                  {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
              </div>
              <p className="text-[13px] text-gray-500">{t.description}</p>
            </div>
          </div>
          <div className="flex gap-4">
            {[
              { l: "Tài liệu", v: String(t.docs.length) },
              { l: "Lượt truy cập", v: t.access.toLocaleString("vi-VN") },
              { l: "Lượt clone", v: String(t.clones) },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-[17px] font-bold text-ink">{s.v}</p>
                <p className="text-[11px] text-gray-400">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-ink">Tài liệu của workspace</h3>
              <p className="text-[13px] text-gray-500">Các tài liệu sẽ được ingest & đánh chỉ mục cho RAG.</p>
            </div>
            <Button onClick={() => setShowAdd((s) => !s)}><Upload className="h-4 w-4" /> Tải lên</Button>
          </div>

          {showAdd && (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-black/5 bg-white/60 p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[12.5px] font-semibold text-ink">Tên tệp</label>
                <input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="VD: payment-gateway-spec.md"
                  className={inputCls}
                />
              </div>
              <Button onClick={simulateUpload} className={cn(uploading && "opacity-60")}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Xác nhận
              </Button>
            </div>
          )}

          <button
            onClick={() => setShowAdd((s) => !s)}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 py-8 text-gray-400 transition hover:border-gold hover:bg-white/40 hover:text-golddk"
          >
            <Upload className="h-6 w-6" />
            <span className="text-[13px] font-semibold">Kéo thả hoặc bấm để tải tài liệu lên</span>
            <span className="text-[11px]">PDF, DOCX, MD, CSV — tối đa 25MB</span>
          </button>

          <div className="mt-4 space-y-2">
            {t.docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 transition hover:bg-white/70">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-gray-500">
                  {d.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{d.name}</p>
                  <p className="text-[11px] text-gray-400">{d.size}</p>
                </div>
                <Badge tone="slate">{d.type}</Badge>
                <Badge tone={d.status === "ready" ? "emerald" : d.status === "processing" ? "amber" : "rose"}>
                  {d.status === "ready" ? "Sẵn sàng" : d.status === "processing" ? "Đang xử lý" : "Lỗi"}
                </Badge>
                <button onClick={() => removeDoc(d.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {t.docs.length === 0 && (
              <p className="py-6 text-center text-[13px] text-gray-400">Chưa có tài liệu nào. Tải lên để bắt đầu.</p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-bold text-ink">Loại UML đi kèm</h3>
            <div className="flex flex-wrap gap-2">
              {t.uml.map((u) => (
                <span key={u} className="inline-flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-semibold text-gray-600 ring-1 ring-inset ring-black/5">
                  <Check className="h-3 w-3 text-emerald-600" /> {u}
                </span>
              ))}
              <button className="inline-flex items-center gap-1 rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-[12px] font-semibold text-gray-400 hover:border-gold hover:text-golddk">
                <Plus className="h-3 w-3" /> Thêm
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[14px] font-bold text-ink">Hiển thị</h3>
            <div className="space-y-2.5">
              {[
                { l: "Công khai trên thư viện mẫu", on: true },
                { l: "Cho phép người dùng clone", on: true },
                { l: "Tự động tạo workspace AI", on: false },
              ].map((s) => (
                <label key={s.l} className="flex items-center justify-between text-[13px] text-gray-600">
                  {s.l}
                  <span className={cn("relative h-5 w-9 rounded-full transition", s.on ? "bg-ink" : "bg-black/10")}>
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

/* ------------------------- Templates grid ------------------------- */
function Templates({
  list,
  onOpen,
  onCreate,
}: {
  list: WorkspaceTemplate[];
  onOpen: (id: number) => void;
  onCreate: () => void;
}) {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-ink">Mẫu workspace theo chủ đề</h3>
          <p className="text-[13px] text-gray-500">Tạo sẵn workspace cho Banking, E-commerce, Social, Hospital.</p>
        </div>
        <Button onClick={onCreate}><Plus className="h-4 w-4" /> Tạo mẫu</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => (
          <TemplateCard key={t.id} t={t} onOpen={() => onOpen(t.id)} />
        ))}
        <button
          onClick={onCreate}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/10 text-gray-400 transition hover:border-gold hover:text-golddk"
        >
          <Plus className="h-7 w-7" />
          <span className="text-[13px] font-semibold">Tạo mẫu workspace</span>
        </button>
      </div>
    </div>
  );
}

export default function Operation() {
  const [tab, setTab] = useState<"overview" | "templates">("templates");
  const [list, setList] = useState<WorkspaceTemplate[]>(seedTemplates);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = useMemo(() => list.find((t) => t.id === selectedId) ?? null, [list, selectedId]);

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

  return (
    <div className="space-y-5">
      <PageHeader title="Mẫu Workspace" subtitle="Tạo sẵn workspace theo chủ đề & quản lý knowledge base" />
      <Card className="p-5">
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
