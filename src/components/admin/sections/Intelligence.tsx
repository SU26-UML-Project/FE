import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Database,
  Eye,
  FileText,
  Layers,
  Loader2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Save,
  ScanSearch,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  intelConfig,
  vectorDbCatalog,
  type RagDoc,
} from "../data";
import { Badge, Button, Card, EndpointBadge } from "../ui";
import { Modal } from "../Modal";
import { MarkdownEditor, MarkdownView } from "../MarkdownView";
import { cn } from "../../../utils/cn";
import { aiAdminService } from "../../../services/aiAdminService";
import type { AiWorkspaceInfo, AiDocument, AiSystemConfig, AiVersionInfo } from "../../../types/ai";

type CatKey = (typeof intelConfig)[number]["key"];
type VdbInstance = { providerId: string; fields: Record<string, string> };

type DisplayDoc = {
  id: string;
  name: string;
  workspace: string;
  size: string;
  status: "ready" | "processing" | "failed";
  content?: string;
  docpath?: string;
  isLocal: boolean;
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const localProviders = ["Ollama", "LM Studio", "LocalAI"];
const kindLabel: Record<string, string> = {
  embedded: "Nhúng sẵn",
  "self-hosted": "Self-hosted",
  cloud: "Cloud",
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-[12.5px] font-medium text-slate-700">
        {label}
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "appearance-none pr-9")}>
        {options.map((o) => (<option key={o}>{o}</option>))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function DetectButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[12.5px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
      {loading ? "Đang quét…" : label}
    </button>
  );
}

function SaveBar({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <div />
      <button
        onClick={onSave}
        disabled={saving}
        className={cn("inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition", saved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-700 disabled:opacity-60")}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saving ? "Đang đồng bộ…" : saved ? "Đã đồng bộ" : "Đồng bộ cấu hình"}
      </button>
    </div>
  );
}

export default function Intelligence() {
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<CatKey>("connection");

  // ---- Connection ----
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [test, setTest] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState("");

  // ---- Version & Config ----
  const [versionInfo, setVersionInfo] = useState<AiVersionInfo | null>(null);
  const [sysConfig, setSysConfig] = useState<AiSystemConfig | null>(null);

  // ---- Providers ----
  const [providers, setProviders] = useState<string[]>(["Ollama", "LM Studio", "LocalAI", "OpenAI", "Anthropic", "Groq"]);

  // ---- Workspaces ----
  const [workspaces, setWorkspaces] = useState<AiWorkspaceInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  // ---- LLM ----
  const [llmProvider, setLlmProvider] = useState("");
  const [llmUrl, setLlmUrl] = useState("");
  const [model, setModel] = useState("");
  const [detectedLlm, setDetectedLlm] = useState<string[]>([]);
  const [detectingLlm, setDetectingLlm] = useState(false);
  const [temp, setTemp] = useState(0.7);

  // ---- Embedding ----
  const [embProvider, setEmbProvider] = useState("");
  const [emb, setEmb] = useState("");
  const [detectedEmb, setDetectedEmb] = useState<string[]>([]);
  const [detectingEmb, setDetectingEmb] = useState(false);

  // ---- Vector DB ----
  const [activeVdbs, setActiveVdbs] = useState<VdbInstance[]>([{ providerId: "lancedb", fields: {} }]);
  const [vdb, setVdb] = useState("lancedb");
  const [vdbModal, setVdbModal] = useState(false);
  const [vdbPick, setVdbPick] = useState("chroma");
  const [vdbForm, setVdbForm] = useState<Record<string, string>>({});

  // ---- Documents ----
  const [docs, setDocs] = useState<AiDocument[]>([]);
  const [localDocs, setLocalDocs] = useState<RagDoc[]>([]);
  const [docWs, setDocWs] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [viewDoc, setViewDoc] = useState<{ name: string; content: string; workspace: string } | null>(null);
  const [docEditor, setDocEditor] = useState<{ mode: "create" | "edit"; doc?: RagDoc; name: string; workspace: string; content: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ name: string; workspace: string; docpath?: string; isLocal: boolean } | null>(null);

  // ---- Save states ----
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState<Record<string, boolean>>({});

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const normalizeName = (n: string) => {
    let s = (n.trim() || "tai-lieu").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9._-]+/g, "-");
    if (!s.endsWith(".md")) s += ".md";
    return s;
  };

  const triggerSave = (key: string, fn: () => Promise<unknown>) => {
    setSaving((s) => ({ ...s, [key]: true }));
    setJustSaved((s) => ({ ...s, [key]: false }));
    fn()
      .then(() => {
        setSaving((s) => ({ ...s, [key]: false }));
        setJustSaved((s) => ({ ...s, [key]: true }));
        setTimeout(() => setJustSaved((s) => ({ ...s, [key]: false })), 1800);
      })
      .catch(() => {
        setSaving((s) => ({ ...s, [key]: false }));
      });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      aiAdminService.getSystemConfig().catch(() => null),
      aiAdminService.getAiVersion().catch(() => null),
      aiAdminService.getProviders().catch(() => null),
      aiAdminService.getWorkspaces().catch(() => null),
      aiAdminService.getDocuments().catch(() => null),
    ])
      .then(([cfgRes, verRes, provRes, wsRes, docRes]) => {
        const cfg = cfgRes?.result;
        if (cfg) {
          setSysConfig(cfg);
          if (cfg.llmProvider) setLlmProvider(cfg.llmProvider);
          if (cfg.model) { setModel(cfg.model); }
          if (cfg.vectorDb) {
            setVdb(cfg.vectorDb);
            setActiveVdbs([{ providerId: cfg.vectorDb, fields: { url: cfg.vectorDbEndpoint || "" } }]);
          }
        }
        if (verRes?.result) setVersionInfo(verRes.result);
        if (provRes?.result && provRes.result.length > 0) setProviders(provRes.result);
        if (wsRes?.result) setWorkspaces(wsRes.result);
        if (docRes?.result) setDocs(docRes.result);
      })
      .finally(() => setLoading(false));
  }, []);

  const wsSlugs = workspaces.map((w) => w.slug);
  const canDetectLlm = localProviders.includes(llmProvider);
  const canDetectEmb = localProviders.includes(embProvider);
  const llmOptions = detectedLlm.length ? detectedLlm : (model ? [model] : []);
  const embOptions = detectedEmb.length ? detectedEmb : (emb ? [emb] : []);

  // ---- Merge API docs + local docs for display ----
  const allDocs: DisplayDoc[] = [
    ...docs.map((d) => ({
      id: d.docId,
      name: d.filename,
      workspace: d.docpath?.split("/")[0] || d.filename.split(".")[0],
      size: d.size != null ? `${(d.size / 1024).toFixed(1)} KB` : "—",
      status: (d.status === "ready" || d.status === "processing" || d.status === "failed" ? d.status : "processing") as DisplayDoc["status"],
      docpath: d.docpath,
      isLocal: false as const,
    })),
    ...localDocs.map((d) => ({
      id: String(d.id),
      name: d.name,
      workspace: d.workspace,
      size: d.size,
      status: d.status,
      content: d.content,
      isLocal: true as const,
    })),
  ];

  const filteredDocs = allDocs.filter(
    (d) => (docWs === "all" || d.workspace === docWs) && d.name.toLowerCase().includes(docSearch.toLowerCase())
  );

  const latencyStr = testLatency || "—";
  const wsCount = workspaces.length;

  // ---- Connection handlers ----
  function testConnection() {
    setTest("loading");
    setTestLatency("");
    aiAdminService.testConnection()
      .then((res) => {
        if (res.result.connected) {
          setTest("ok");
          setTestLatency(`${res.result.latencyMs}ms`);
        } else {
          setTest("fail");
        }
      })
      .catch(() => setTest("fail"));
  }

  function saveConnection() {
    triggerSave("conn", () => aiAdminService.updateSystemConfig({ baseUrl, apiKey }));
  }

  // ---- Workspace handlers ----
  function addWs() {
    if (!newName.trim()) return;
    const slug = slugify(newName);
    aiAdminService.updateWorkspace({ model: model || undefined }, slug)
      .then(() => aiAdminService.getWorkspaces())
      .then((res) => setWorkspaces(res.result || []))
      .catch(() => {});
    setNewName("");
    setShowCreate(false);
  }

  function deleteWs(slug: string) {
    aiAdminService.updateWorkspace({}, slug)
      .then(() => setWorkspaces((arr) => arr.filter((w) => w.slug !== slug)))
      .catch(() => {});
  }

  // ---- LLM handlers ----
  function autoDetectLlm() {
    setDetectingLlm(true);
    setDetectedLlm([]);
    aiAdminService.getProviderModels(llmProvider, llmUrl || undefined)
      .then((res) => {
        const models = res.result || [];
        setDetectedLlm(models);
        if (models.length > 0) setModel(models[0]);
      })
      .catch(() => {})
      .finally(() => setDetectingLlm(false));
  }

  function saveLlm() {
    triggerSave("llm", () => aiAdminService.updateSystemConfig({ llmProvider, baseUrl: llmUrl, model }));
  }

  // ---- Embedding handlers ----
  function autoDetectEmb() {
    setDetectingEmb(true);
    setDetectedEmb([]);
    aiAdminService.getProviderModels(embProvider, llmUrl || undefined)
      .then((res) => {
        const models = res.result || [];
        setDetectedEmb(models);
        if (models.length > 0) setEmb(models[0]);
      })
      .catch(() => {})
      .finally(() => setDetectingEmb(false));
  }

  function saveEmb() {
    triggerSave("emb", () => aiAdminService.updateSystemConfig({ model: emb }));
  }

  // ---- Vector DB handlers ----
  const providerById = (id: string) => vectorDbCatalog.find((p) => p.id === id)!;
  const isVdbActive = (id: string) => activeVdbs.some((a) => a.providerId === id);

  function addVdb() {
    const prov = providerById(vdbPick);
    if (isVdbActive(prov.id)) return;
    setActiveVdbs((a) => [...a, { providerId: prov.id, fields: vdbForm }]);
    setVdb(prov.id);
    setVdbModal(false);
    setVdbForm({});
  }

  function removeVdb(id: string) {
    if (id === "lancedb") return;
    setActiveVdbs((a) => a.filter((x) => x.providerId !== id));
    if (vdb === id) setVdb("lancedb");
  }

  function saveVdb() {
    const active = activeVdbs.find((a) => a.providerId === vdb);
    triggerSave("vdb", () => aiAdminService.updateSystemConfig({
      vectorDb: vdb,
      vectorDbEndpoint: active?.fields?.url || "",
    }));
  }

  // ---- Document handlers ----
  function openCreate() {
    setDocEditor({ mode: "create", name: "", workspace: wsSlugs[0] || "default", content: "# Tên tài liệu\n\nMô tả nội dung..." });
  }

  function openEdit(d: DisplayDoc) {
    const local = localDocs.find((x) => String(x.id) === d.id);
    if (!local) return;
    setDocEditor({ mode: "edit", doc: local, name: local.name, workspace: local.workspace, content: local.content });
  }

  function openView(d: DisplayDoc) {
    const local = localDocs.find((x) => String(x.id) === d.id);
    setViewDoc({ name: d.name, content: local?.content || "Nội dung không khả dụng để xem trực tiếp.", workspace: d.workspace });
  }

  function saveDoc() {
    if (!docEditor) return;
    const name = normalizeName(docEditor.name);
    if (docEditor.mode === "create") {
      const newDoc: RagDoc = {
        id: Date.now(),
        name,
        workspace: docEditor.workspace,
        size: `${Math.max(0.2, (docEditor.content || "").length / 1024).toFixed(1)} KB`,
        status: "ready",
        content: docEditor.content || "",
      };
      setLocalDocs((d) => [newDoc, ...d]);
      setDocEditor(null);
    } else if (docEditor.doc) {
      const id = docEditor.doc.id;
      setLocalDocs((d) =>
        d.map((x) =>
          x.id === id
            ? { ...x, name, workspace: docEditor.workspace, content: docEditor.content || "", size: `${Math.max(0.2, (docEditor.content || "").length / 1024).toFixed(1)} KB` }
            : x
        )
      );
      setDocEditor(null);
    }
  }

  function doDelete() {
    if (!confirmDel) return;
    if (confirmDel.isLocal) {
      setLocalDocs((d) => d.filter((x) => x.name !== confirmDel.name));
    } else if (confirmDel.docpath) {
      aiAdminService.deleteDocument(confirmDel.docpath)
        .then(() => setDocs((d) => d.filter((x) => x.docpath !== confirmDel.docpath)))
        .catch(() => {});
    }
    setConfirmDel(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* connection banner */}
      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white"><Plug className="h-6 w-6" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-slate-900">AnythingLLM Engine</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" /> Connected</span>
            </div>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">
              {baseUrl || "http://localhost:3001/api"} · {versionInfo?.version || "—"}
              {versionInfo?.environment ? ` · ${versionInfo.environment}` : ""}
              {sysConfig?.hasApiKey ? " · Bearer ••••" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden grid-cols-3 gap-5 sm:grid">
            {[
              { l: "Độ trễ", v: latencyStr },
              { l: "Version", v: versionInfo?.version || "—" },
              { l: "Workspace", v: String(wsCount) },
            ].map((x) => (
              <div key={x.l} className="text-center">
                <p className="text-[17px] font-semibold text-slate-900">{x.v}</p>
                <p className="text-[11px] text-slate-400">{x.l}</p>
              </div>
            ))}
          </div>
          <button onClick={testConnection} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
            {test === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : test === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <RefreshCw className="h-4 w-4" />}
            Test
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* category nav */}
        <Card className="h-fit p-2">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {intelConfig.map((c) => {
              const active = cat === c.key;
              return (
                <button key={c.key} onClick={() => setCat(c.key)} className={cn("flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition lg:w-full", active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
                  <svg viewBox="0 0 20 20" className={cn("h-[17px] w-[17px] shrink-0", active ? "text-white" : "text-slate-400")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {c.key === "connection" && <><path d="M2.5 10h15" /><path d="M10 2.5v15" /><circle cx="10" cy="10" r="5" /><path d="M7.5 7.5 13 13" /><path d="M13 7.5 7.5 13" /></>}
                    {c.key === "workspaces" && <><rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" /><rect x="11" y="2.5" width="6.5" height="5" rx="1.2" /><rect x="11" y="12.5" width="6.5" height="5" rx="1.2" /><rect x="2.5" y="12.5" width="6.5" height="5" rx="1.2" /></>}
                    {c.key === "llm" && <><path d="M10 2.5A5 5 0 0 0 5 7.5c0 2 1.5 3.5 2 4l1 3h4l1-3c.5-.5 2-2 2-4a5 5 0 0 0-5-5z" /><circle cx="10" cy="7" r="1.5" /><path d="M8 16h4" /><path d="M9 18h2" /></>}
                    {c.key === "embeddings" && <><rect x="4" y="2.5" width="12" height="15" rx="2" /><rect x="7" y="5.5" width="6" height="3" rx="0.8" /><circle cx="10" cy="11.5" r="2" /><path d="M8.5 13.5 10 15l1.5-1.5" /></>}
                    {c.key === "vectordb" && <><ellipse cx="10" cy="5" rx="6" ry="2.5" /><path d="M4 5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" /><path d="M4 9v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V9" /></>}
                    {c.key === "documents" && <><path d="M12 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V7l-3.5-4.5z" /><path d="M12 2.5V7h4.5" /><rect x="6.5" y="9" width="7" height="1.2" rx="0.6" /><rect x="6.5" y="12" width="5" height="1.2" rx="0.6" /></>}
                  </svg>
                  <span className="hidden lg:block">
                    <span className="block text-[13px] font-medium leading-tight">{c.label}</span>
                    <span className={cn("block text-[11px]", active ? "text-slate-300" : "text-slate-400")}>{c.desc}</span>
                  </span>
                  <span className="lg:hidden text-[13px] font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          {/* ---------- CONNECTION ---------- */}
          {cat === "connection" && (
            <div className="animate-fade-in">
              <h3 className="text-[14px] font-semibold text-slate-900">Kết nối AnythingLLM</h3>
              <p className="text-[13px] text-slate-500">Gọi trực tiếp REST API — không nhúng giao diện bên AnythingLLM để giữ đồng bộ.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Base URL"><input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={cn(inputCls, "font-mono")} /></Field>
                <Field label="API Key" hint="Bearer"><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" className={cn(inputCls, "font-mono")} /></Field>
                <Field label="Timeout (ms)"><input defaultValue="30000" className={inputCls} /></Field>
                <Field label="Tự động đồng bộ"><Select value="Mỗi 5 phút" onChange={() => {}} options={["Mỗi 1 phút", "Mỗi 5 phút", "Mỗi 15 phút", "Tắt"]} /></Field>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-[12.5px] text-emerald-700">Kết nối thành công. Phiên bản <b>{versionInfo?.version || "—"}</b>, hỗ trợ streaming chat & RAG multi-workspace.</p>
              </div>
              <SaveBar saving={!!saving.conn} saved={!!justSaved.conn} onSave={saveConnection} />
            </div>
          )}

          {/* ---------- WORKSPACES ---------- */}
          {cat === "workspaces" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Quản lý Workspace</h3>
                  <p className="text-[13px] text-slate-500">Không gian tri thức RAG — CRUD qua API.</p>
                </div>
                <button onClick={() => setShowCreate((s) => !s)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700"><Plus className="h-4 w-4" /> Workspace</button>
              </div>
              {showCreate && (
                <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label="Tên workspace mới"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="VD: Insurance Claims" className={inputCls} /></Field>
                  </div>
                  <button onClick={addWs} className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-700">Tạo</button>
                </div>
              )}
              <div className="mt-4 -mx-2 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-2 font-semibold">Workspace</th>
                      <th className="px-3 py-2 font-semibold">Slug</th>
                      <th className="px-3 py-2 font-semibold">Model</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workspaces.map((w) => (
                      <tr key={w.slug} className="group transition hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Layers className="h-4 w-4" /></span>
                            <div>
                              <p className="text-[13px] font-medium text-slate-900">{w.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[13px] text-slate-500">/{w.slug}</td>
                        <td className="px-3 py-2.5"><Badge tone="brand">{model || "—"}</Badge></td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end opacity-0 transition group-hover:opacity-100">
                            <button className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => deleteWs(w.slug)}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <EndpointBadge method="GET" path="/api/v1/workspaces" />
                <EndpointBadge method="POST" path="/api/v1/workspaces" />
                <EndpointBadge method="DELETE" path="/api/v1/workspace/{slug}" />
              </div>
            </div>
          )}

          {/* ---------- LLM ---------- */}
          {cat === "llm" && (
            <div className="animate-fade-in">
              <h3 className="text-[14px] font-semibold text-slate-900">Cấu hình mô hình LLM</h3>
              <p className="text-[13px] text-slate-500">Ưu tiên chạy local để bảo mật dữ liệu. Bấm “Tự phát hiện” để quét mô hình từ engine cục bộ.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="LLM Provider"><Select value={llmProvider} onChange={setLlmProvider} options={providers} /></Field>
                <Field label="Base URL" hint="local"><input value={llmUrl} onChange={(e) => setLlmUrl(e.target.value)} className={cn(inputCls, "font-mono")} /></Field>
                <Field label="Chat Model">
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1"><Select value={model} onChange={setModel} options={llmOptions} /></div>
                    {canDetectLlm && <DetectButton loading={detectingLlm} onClick={autoDetectLlm} label="Tự phát hiện" />}
                  </div>
                </Field>
                <Field label="Max Tokens"><input defaultValue="4096" className={inputCls} /></Field>
              </div>
              {canDetectLlm && (
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  {detectedLlm.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <p className="text-[12.5px] text-slate-600">Đã phát hiện <b className="text-slate-900">{detectedLlm.length}</b> mô hình từ <span className="font-mono text-slate-500">{llmUrl}</span></p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {detectedLlm.map((m) => (
                          <button key={m} onClick={() => setModel(m)} className={cn("rounded-md px-2 py-1 font-mono text-[11px] transition", model === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}>{m}</button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[12.5px] text-slate-500">Quét mô hình cục bộ thông qua</p>
                      <EndpointBadge method="GET" path="/api/tags" className="bg-white" />
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-slate-700">Temperature</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[12px] font-semibold text-slate-700">{temp.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="mt-3 w-full accent-indigo-600" />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Tuyến tính</span><span>Sáng tạo</span></div>
              </div>
              <SaveBar saving={!!saving.llm} saved={!!justSaved.llm} onSave={saveLlm} />
            </div>
          )}

          {/* ---------- EMBEDDINGS ---------- */}
          {cat === "embeddings" && (
            <div className="animate-fade-in">
              <h3 className="text-[14px] font-semibold text-slate-900">Mô hình Embedding</h3>
              <p className="text-[13px] text-slate-500">Đổi embedder sẽ cần re-embed toàn bộ corpus.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Provider"><Select value={embProvider} onChange={setEmbProvider} options={providers} /></Field>
                <Field label="Embedding Model">
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1"><Select value={emb} onChange={setEmb} options={embOptions} /></div>
                    {canDetectEmb && <DetectButton loading={detectingEmb} onClick={autoDetectEmb} label="Tự phát hiện" />}
                  </div>
                </Field>
                <Field label="Chunk Size"><input defaultValue="1024" className={inputCls} /></Field>
                <Field label="Chunk Overlap"><input defaultValue="120" className={inputCls} /></Field>
              </div>
              {canDetectEmb && (
                <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  {detectedEmb.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <p className="mr-2 text-[12.5px] text-slate-600">Phát hiện <b className="text-slate-900">{detectedEmb.length}</b> mô hình nhúng:</p>
                      {detectedEmb.map((m) => (
                        <button key={m} onClick={() => setEmb(m)} className={cn("rounded-md px-2 py-1 font-mono text-[11px] transition", emb === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}>{m}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-[12.5px] text-slate-500">Quét mô hình nhúng cục bộ thông qua</p>
                      <EndpointBadge method="GET" path="/api/tags" className="bg-white" />
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3">
                <p className="text-[12.5px] text-amber-700">Đổi mô hình nhúng sẽ kích hoạt re-embedding. Dự kiến ~18 phút.</p>
              </div>
              <SaveBar saving={!!saving.emb} saved={!!justSaved.emb} onSave={saveEmb} />
            </div>
          )}

          {/* ---------- VECTOR DB ---------- */}
          {cat === "vectordb" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Vector Database</h3>
                  <p className="text-[13px] text-slate-500">Chọn nhà cung cấp lưu trữ vector. Bấm “Thêm” để cấu hình nhà cung cấp mới.</p>
                </div>
                <Badge tone="brand"><Database className="h-3 w-3" /> {activeVdbs.length} đã kết nối</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activeVdbs.map((inst) => {
                  const p = providerById(inst.providerId);
                  const active = vdb === p.id;
                  const urlVal = inst.fields.url || inst.fields.db;
                  return (
                    <div key={p.id} className={cn("relative rounded-lg border p-4 transition", active ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                      <button onClick={() => setVdb(p.id)} className="block w-full text-left">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.color }}><Database className="h-4 w-4" /></span>
                        <p className="mt-2 text-[13px] font-medium text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{kindLabel[p.kind]}</p>
                        {urlVal && <p className="mt-1 truncate font-mono text-[10.5px] text-slate-400">{urlVal}</p>}
                        {active && <p className="mt-1.5 text-[10.5px] font-semibold text-slate-900">● Đang dùng</p>}
                      </button>
                      {p.id !== "lancedb" && (
                        <button onClick={() => removeVdb(p.id)} className="absolute right-1.5 top-1.5 rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  );
                })}
                <button onClick={() => { setVdbModal(true); setVdbForm({}); }} className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600">
                  <Plus className="h-6 w-6" />
                  <span className="text-[12.5px] font-medium">Thêm nhà cung cấp</span>
                </button>
              </div>
              <SaveBar saving={!!saving.vdb} saved={!!justSaved.vdb} onSave={saveVdb} />
            </div>
          )}

          {/* ---------- DOCUMENTS ---------- */}
          {cat === "documents" && (
            <div className="animate-fade-in">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
                    Tài liệu RAG <Badge tone="brand"><FileText className="h-3 w-3" /> Chỉ Markdown</Badge>
                  </h3>
                  <p className="text-[13px] text-slate-500">Hỗ trợ duy nhất định dạng .md — tạo, xem, sửa, xoá tài liệu.</p>
                </div>
                <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tạo tài liệu</Button>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                  <input value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="Tìm tài liệu…" className="w-44 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 sm:w-56" />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setDocWs("all")} className={cn("rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition", docWs === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Tất cả</button>
                  {wsSlugs.map((s) => (
                    <button key={s} onClick={() => setDocWs(s)} className={cn("rounded-lg px-2.5 py-1.5 font-mono text-[11.5px] transition", docWs === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredDocs.map((d) => (
                  <div key={d.id} className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      {d.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <FileText className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-slate-800">{d.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{d.workspace} · {d.size}</p>
                    </div>
                    <Badge tone={d.status === "ready" ? "emerald" : d.status === "processing" ? "amber" : "rose"}>
                      {d.status === "ready" ? "Sẵn sàng" : d.status === "processing" ? "Đang xử lý" : "Lỗi"}
                    </Badge>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openView(d)} title="Xem" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" /></button>
                      {d.isLocal && (
                        <button onClick={() => openEdit(d)} title="Sửa" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => setConfirmDel({ name: d.name, workspace: d.workspace, docpath: d.docpath, isLocal: d.isLocal })} title="Xoá" className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                {filteredDocs.length === 0 && (
                  <p className="py-10 text-center text-[13px] text-slate-400">Chưa có tài liệu nào phù hợp.</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <EndpointBadge method="POST" path="/api/v1/document/upload" />
                <EndpointBadge method="GET" path="/api/v1/document/{docName}" />
                <EndpointBadge method="DELETE" path="/api/v1/document/{docName}" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ===== Vector DB Modal ===== */}
      <Modal open={vdbModal} onClose={() => setVdbModal(false)} title="Thêm nhà cung cấp Vector DB" desc="Toàn bộ nhà cung cấp mà AnythingLLM hỗ trợ" size="xl">
        <div className="grid gap-4 sm:grid-cols-[210px_1fr]">
          <div className="scroll-slim max-h-[52vh] space-y-1 overflow-y-auto pr-1">
            {vectorDbCatalog.map((p) => {
              const sel = vdbPick === p.id;
              const added = isVdbActive(p.id);
              return (
                <button key={p.id} onClick={() => { setVdbPick(p.id); setVdbForm({}); }} className={cn("flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition", sel ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md text-white" style={{ backgroundColor: p.color }}><Database className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.name}</span>
                    <span className="block text-[10.5px] text-slate-400">{kindLabel[p.kind]}</span>
                  </span>
                  {added && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            {(() => {
              const p = providerById(vdbPick);
              const added = isVdbActive(p.id);
              return (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.color }}><Database className="h-4 w-4" /></span>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-slate-900">{p.name}</p>
                      <Badge tone="slate">{kindLabel[p.kind]}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">{p.desc}</p>
                  {p.fields.length === 0 ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-[12.5px] text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Không cần cấu hình — chạy nhúng sẵn, không yêu cầu URL hay API Key.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {p.fields.map((f) => (
                        <Field key={f.key} label={f.label}>
                          <input type={f.secret ? "password" : "text"} value={vdbForm[f.key] || ""} onChange={(e) => setVdbForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className={cn(inputCls, f.secret && "font-mono")} />
                        </Field>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <EndpointBadge method="POST" path="/api/v1/system/vector-db" />
                    <button onClick={addVdb} disabled={added} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      <Plus className="h-4 w-4" /> {added ? "Đã thêm" : "Thêm nhà cung cấp"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </Modal>

      {/* ===== View document ===== */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.name || ""} desc={viewDoc ? `Workspace · ${viewDoc.workspace}` : ""} size="lg">
        <MarkdownView content={viewDoc?.content || ""} />
      </Modal>

      {/* ===== Create / Edit document ===== */}
      <Modal
        open={!!docEditor}
        onClose={() => setDocEditor(null)}
        title={docEditor?.mode === "create" ? "Tạo tài liệu Markdown" : "Chỉnh sửa tài liệu"}
        desc="Hỗ trợ duy nhất định dạng Markdown (.md)"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDocEditor(null)}><X className="h-4 w-4" /> Huỷ</Button>
            <Button onClick={saveDoc}><Save className="h-4 w-4" /> Lưu tài liệu</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên tệp" hint="tự thêm .md">
              <input value={docEditor?.name || ""} onChange={(e) => setDocEditor((s) => (s ? { ...s, name: e.target.value } : s))} placeholder="vd: payment-flow" className={inputCls} />
            </Field>
            <Field label="Workspace">
              <div className="flex-1"><Select value={docEditor?.workspace || (wsSlugs[0] || "default")} onChange={(v) => setDocEditor((s) => (s ? { ...s, workspace: v } : s))} options={wsSlugs} /></div>
            </Field>
          </div>
          <Field label="Nội dung (Markdown)">
            <MarkdownEditor value={docEditor?.content || ""} onChange={(v) => setDocEditor((s) => (s ? { ...s, content: v } : s))} />
          </Field>
        </div>
      </Modal>

      {/* ===== Delete confirm ===== */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Xoá tài liệu?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <button onClick={doDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700"><Trash2 className="h-4 w-4" /> Xoá</button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slate-600">
          Tài liệu <b className="text-slate-900">{confirmDel?.name}</b> sẽ bị gỡ khỏi workspace{" "}
          <span className="font-mono text-slate-500">{confirmDel?.workspace}</span> và xoá khỏi vector DB. Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}
