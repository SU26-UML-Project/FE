import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BrainCircuit,
  Briefcase,
  Check,
  CheckCircle2,
  Cloud,
  Cpu,
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
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  intelConfig,
  vectorDbCatalog,
  llmProviderCatalog,
  embProviderCatalog,
} from "../data";
import { Badge, Button, Card, SearchInput, Skeleton } from "../ui";
import SmartSelect from "../../../../shared/ui/SmartSelect";
import DocEditorModal from "../DocEditorModal";
import { Modal } from "../Modal";
import { MarkdownView } from "../MarkdownView";
import { cn } from "../../../../shared/lib/cn";
import { aiAdminService } from "../../api/aiAdminApi";
import type { AiWorkspaceInfo, AiWorkspace, AiWorkspaceUpdateRequest, AiDocument, AiSystemConfig, AiVersionInfo } from "../../../../types/ai";

type CatKey = (typeof intelConfig)[number]["key"];
type VdbInstance = { providerId: string; fields: Record<string, string> };

type DisplayDoc = {
  id: string;
  name: string;
  workspace: string;
  size: string;
  status: "ready" | "processing" | "failed";
  docpath?: string;
};

type DocEditorState = {
  mode: "create" | "edit";
  name: string;
  workspace: string;
  content: string;
  originalDocpath?: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const providerDefaultBaseUrl: Record<string, string> = {
  ollama: "http://localhost:11434",
  groq: "https://api.groq.com/openai/v1",
};
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
  const [test, setTest] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState("");
  const [testTimestamp, setTestTimestamp] = useState("");

  // ---- Version & Config ----
  const [versionInfo, setVersionInfo] = useState<AiVersionInfo | null>(null);
  const [sysConfig, setSysConfig] = useState<AiSystemConfig | null>(null);
  const [configLoadError, setConfigLoadError] = useState(false);

  // ---- Providers ----
  const [providers, setProviders] = useState<string[]>(["ollama", "lm studio", "localai", "openai", "anthropic", "groq"]);

  // ---- Workspaces ----
  const [workspaces, setWorkspaces] = useState<AiWorkspaceInfo[]>([]);
  const [wsTab, setWsTab] = useState<"_all" | "_create" | string>("_all");
  const [creatingWs, setCreatingWs] = useState(false);
  const [newName, setNewName] = useState("");
  const [wsSearch, setWsSearch] = useState("");
  const [wsConfirmDel, setWsConfirmDel] = useState<string | null>(null);
  const [wsTabDetail, setWsTabDetail] = useState<AiWorkspace | null>(null);
  const [wsTabDirty, setWsTabDirty] = useState<Partial<AiWorkspaceUpdateRequest> | null>(null);
  const [wsTabLoading, setWsTabLoading] = useState(false);
  const [wsSavingSlug, setWsSavingSlug] = useState<string | null>(null);
  const [detectedWsModels, setDetectedWsModels] = useState<string[]>([]);
  const [detectingWsModels, setDetectingWsModels] = useState(false);

  // ---- LLM ----
  const [llmProvider, setLlmProvider] = useState("");
  const [llmUrl, setLlmUrl] = useState("");
  const [model, setModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [detectedLlm, setDetectedLlm] = useState<string[]>([]);
  const [detectingLlm, setDetectingLlm] = useState(false);


  // ---- Embedding ----
  const [embProvider, setEmbProvider] = useState("");
  const [emb, setEmb] = useState("");
  const [detectedEmb, setDetectedEmb] = useState<string[]>([]);
  const [detectingEmb, setDetectingEmb] = useState(false);


  // ---- Vector DB ----
  const [activeVdbs, setActiveVdbs] = useState<VdbInstance[]>([{ providerId: "lancedb", fields: {} }]);
  const [vdb, setVdb] = useState("lancedb");
  const [vdbSearch, setVdbSearch] = useState("");

  // ---- Documents ----
  const [docs, setDocs] = useState<AiDocument[]>([]);
  const [docContentCache, setDocContentCache] = useState<Record<string, string>>({});
  const [uploadTarget, setUploadTarget] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reembedding, setReembedding] = useState(false);
  const [reembedConfirm, setReembedConfirm] = useState(false);
  const [viewDoc, setViewDoc] = useState<{ name: string; content: string; workspace: string; loading?: boolean } | null>(null);
  const [docEditor, setDocEditor] = useState<DocEditorState | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ name: string; workspace: string; docpath?: string } | null>(null);

  // ---- Save states ----
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState<Record<string, boolean>>({});
  const optimisticReady = useRef(new Set<string>());

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
          setConfigLoadError(false);
          if (cfg.llmProvider) {
            const match = llmProviderCatalog.find(p => p.id === cfg.llmProvider!.toLowerCase());
            setLlmProvider(match?.id || cfg.llmProvider);
          }
          if (cfg.model) setModel(cfg.model);
          if (cfg.baseUrl) {
            const pId = cfg.llmProvider?.toLowerCase() || "";
            if (pId === "ollama" && providerDefaultBaseUrl.ollama) {
              setLlmUrl(providerDefaultBaseUrl.ollama);
            } else {
              setLlmUrl(cfg.baseUrl);
            }
          }
          if (cfg.embeddingProvider) {
            const match = embProviderCatalog.find(p => p.id === cfg.embeddingProvider!.toLowerCase());
            setEmbProvider(match?.id || cfg.embeddingProvider);
          }
          if (cfg.embeddingModel) setEmb(cfg.embeddingModel);
          if (cfg.hasApiKey) setLlmApiKey("••••••••");
          if (cfg.documentChunkSize != null) setChunkSize(cfg.documentChunkSize);
          if (cfg.documentChunkOverlap != null) setChunkOverlap(cfg.documentChunkOverlap);
          if (cfg.vectorDb) {
            setVdb(cfg.vectorDb);
            setActiveVdbs([{ providerId: cfg.vectorDb, fields: { url: cfg.vectorDbEndpoint || "" } }]);
          }
        } else {
          setConfigLoadError(true);
        }
        if (verRes?.result) setVersionInfo(verRes.result);
        if (provRes?.result && provRes.result.length > 0) setProviders(provRes.result);
        if (wsRes?.result) { setWorkspaces(wsRes.result); if (!uploadTarget) setUploadTarget(wsRes.result[0]?.slug || ""); }
        if (docRes?.result) setDocs(docRes.result);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-detect when provider, base URL or API Key changes (debounced)
  useEffect(() => {
    const timer = setTimeout(autoDetectLlm, 800);
    return () => clearTimeout(timer);
  }, [llmProvider, llmUrl, llmApiKey]);

  useEffect(() => {
    const timer = setTimeout(autoDetectEmb, 800);
    return () => clearTimeout(timer);
  }, [embProvider, llmUrl, llmApiKey]);

  const wsSlugs = workspaces.map((w) => w.slug);
  const filteredWs = wsSearch ? workspaces.filter((w) => w.name.toLowerCase().includes(wsSearch.toLowerCase()) || w.slug.toLowerCase().includes(wsSearch.toLowerCase())) : workspaces;
  const llmOptions = detectedLlm.length ? detectedLlm : (model ? [model] : []);
  const embOptions = detectedEmb.length ? detectedEmb : (emb ? [emb] : []);

  const filteredVdbProviders = vdbSearch ? vectorDbCatalog.filter((p) => p.name.toLowerCase().includes(vdbSearch.toLowerCase())) : vectorDbCatalog;

  const allDocs: DisplayDoc[] = docs.map((d) => {
    const overridden = optimisticReady.current.has(d.filename);
    const raw = d.status;
    let mapped: DisplayDoc["status"];
    if (overridden) {
      mapped = "ready";
    } else if (raw === "ready" || raw === "embedded" || raw == null) {
      mapped = "ready";
    } else if (raw === "processing") {
      mapped = "processing";
    } else if (raw === "failed") {
      mapped = "failed";
    } else {
      mapped = "ready";
    }
    return {
      id: d.docId,
      name: d.filename,
      workspace: d.docpath?.split("/")[0] || d.filename.split(".")[0],
      size: d.size != null ? `${(d.size / 1024).toFixed(1)} KB` : "—",
      status: mapped,
      docpath: d.docpath,
    };
  });

  const filteredDocs = allDocs
    .filter((d) => d.name.toLowerCase().includes(docSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  async function refreshSysConfig() {
    try {
      const res = await aiAdminService.getSystemConfig();
      const cfg = res?.result;
      if (cfg) {
        setSysConfig(cfg);
        setConfigLoadError(false);
        if (cfg.llmProvider) {
          const match = llmProviderCatalog.find(p => p.id === cfg.llmProvider!.toLowerCase());
          setLlmProvider(match?.id || cfg.llmProvider);
        }
        if (cfg.model) setModel(cfg.model);
        if (cfg.baseUrl) setLlmUrl(cfg.baseUrl);
        if (cfg.embeddingProvider) {
          const match = embProviderCatalog.find(p => p.id === cfg.embeddingProvider!.toLowerCase());
          setEmbProvider(match?.id || cfg.embeddingProvider);
        }
        if (cfg.embeddingModel) setEmb(cfg.embeddingModel);
        if (cfg.documentChunkSize != null) setChunkSize(cfg.documentChunkSize);
        if (cfg.documentChunkOverlap != null) setChunkOverlap(cfg.documentChunkOverlap);
        if (cfg.vectorDb) setVdb(cfg.vectorDb);
      }
    } catch { setConfigLoadError(true); }
  }

  const latencyStr = testLatency || "—";
  const wsCount = workspaces.length;

  // ---- Connection handlers ----
  function testConnection() {
    setTest("loading");
    setTestLatency("");
    aiAdminService.testConnection()
      .then((res) => {
        const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setTestTimestamp(now);
        if (res.result.connected) {
          setTest("ok");
          setTestLatency(`${res.result.latencyMs}ms`);
          toast.success(`Kết nối thành công · ${res.result.latencyMs}ms`);
        } else {
          setTest("fail");
          toast.error("Kết nối thất bại");
        }
      })
      .catch(() => {
        setTest("fail");
        const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setTestTimestamp(now);
        toast.error("Kết nối thất bại");
      });
  }

  // ---- Workspace handlers ----
  async function addWs() {
    if (!newName.trim()) return;
    setCreatingWs(true);
    const slug = slugify(newName);
    try {
      await aiAdminService.createWorkspace({ slug, name: newName.trim() });
      const res = await aiAdminService.getWorkspaces();
      if (res?.result) setWorkspaces(res.result);
      setNewName("");
      setWsTab("_all");
      toast.success(`Đã tạo workspace ${slug}`);
    } catch {
      toast.error("Không thể tạo workspace");
    } finally {
      setCreatingWs(false);
    }
  }

  async function deleteWs(slug: string) {
    try {
      await aiAdminService.deleteWorkspace(slug);
      setWorkspaces((arr) => arr.filter((w) => w.slug !== slug));
      setWsConfirmDel(null);
      if (wsTab === slug) setWsTab("_all");
      toast.success(`Đã xoá workspace ${slug}`);
    } catch {
      toast.error("Không thể xoá workspace");
    }
  }

  // ---- Workspace tab handlers ----
  async function loadWsTabDetail(slug: string) {
    setWsTabLoading(true);
    try {
      const res = await aiAdminService.getWorkspace(slug);
      if (res?.result) {
        setWsTabDetail(res.result);
        setWsTabDirty(null);
        const provider = res.result.chatProvider;
        if (provider && !res.result.chatModel) {
          detectWsModels();
        }
      }
    } catch { toast.error("Không thể tải thông tin workspace"); }
    finally { setWsTabLoading(false); }
  }

  function switchWsTab(tab: string) {
    setWsTab(tab);
    setWsTabDetail(null);
    setWsTabDirty(null);
    setDetectedWsModels([]);
    if (tab !== "_all" && tab !== "_create") loadWsTabDetail(tab);
  }

  function updateWsTabField(field: string, value: any) {
    setWsTabDirty((d) => ({ ...(d || {}), [field]: value }));
  }

  async function saveWsTab() {
    if (typeof wsTab !== "string" || wsTab === "_all" || wsTab === "_create" || !wsTabDirty) return;
    setWsSavingSlug(wsTab);
    try {
      const res = await aiAdminService.updateWorkspace(wsTabDirty, wsTab);
      if (res?.result) {
        setWsTabDetail(res.result);
        setWsTabDirty(null);
        toast.success(`Đã lưu workspace ${wsTab}`);
      }
    } catch { toast.error(`Không thể lưu workspace ${wsTab}`); }
    finally { setWsSavingSlug(null); }
  }

  function detectWsModels() {
    const provider = (wsTabDirty?.chatProvider ?? wsTabDetail?.chatProvider ?? "");
    if (!provider) { setDetectedWsModels([]); return; }
    setDetectingWsModels(true);
    aiAdminService.getProviderModels(provider, llmUrl || undefined)
      .then((res) => {
        const list = res.result || [];
        setDetectedWsModels(list);
        if (list.length > 0 && !(wsTabDirty?.model ?? wsTabDetail?.chatModel)) updateWsTabField("model", list[0]);
      })
      .catch((err: any) => { setDetectedWsModels([]); toast.error(err?.response?.data?.message || "Không thể quét model workspace"); })
      .finally(() => setDetectingWsModels(false));
  }

  // ---- LLM handlers ----
  const MASKED_KEY = "••••••••";

  function autoDetectLlm() {
    setDetectingLlm(true);
    const sendKey = llmApiKey && llmApiKey !== MASKED_KEY ? llmApiKey : undefined;
    aiAdminService.getProviderModels(llmProvider, llmUrl || undefined, sendKey)
      .then((res) => {
        const models = res.result || [];
        setDetectedLlm(models);
        if (models.length > 0 && !model) setModel(models[0]);
      })
      .catch((err: any) => { setDetectedLlm([]); toast.error(err?.response?.data?.message || "Không thể quét model"); })
      .finally(() => setDetectingLlm(false));
  }

  function syncWorkspacesWithLlm() {
    workspaces.filter(ws => ws.slug !== "_all").forEach((ws) => {
      aiAdminService.updateWorkspace({ chatProvider: llmProvider?.toLowerCase(), model }, ws.slug)
        .then(() => {
          if (wsTab === ws.slug) { loadWsTabDetail(ws.slug); }
        })
        .catch(() => {});
    });
  }

  function saveLlm() {
    const saveKey = llmApiKey && llmApiKey !== MASKED_KEY ? llmApiKey : undefined;
    // Snapshot user's selections before refreshSysConfig may overwrite them
    const savedProvider = llmProvider;
    const savedModel = model;
    const savedUrl = llmUrl;
    triggerSave("llm", async () => {
      const r = await aiAdminService.updateSystemConfig({
        llmProvider: savedProvider, baseUrl: savedUrl || undefined, model: savedModel, apiKey: saveKey,
        embeddingProvider: sysConfig?.embeddingProvider ?? undefined,
        embeddingModel: sysConfig?.embeddingModel ?? undefined,
        documentChunkSize: chunkSize,
        documentChunkOverlap: chunkOverlap,
      });
      await refreshSysConfig();
      setLlmProvider(savedProvider);
      setModel(savedModel);
      setLlmUrl(savedUrl || "");
      syncWorkspacesWithLlm();
      autoDetectLlm();
      return r;
    });
  }

  // ---- Embedding handlers ----
  function autoDetectEmb() {
    setDetectingEmb(true);
    aiAdminService.getProviderModels(embProvider, llmUrl || undefined)
      .then((res) => {
        const models = res.result || [];
        setDetectedEmb(models);
        if (models.length > 0 && !emb) setEmb(models[0]);
      })
      .catch((err: any) => { setDetectedEmb([]); toast.error(err?.response?.data?.message || "Không thể quét embedding model"); })
      .finally(() => setDetectingEmb(false));
  }

  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  function saveEmb() {
    triggerSave("emb", async () => {
      const r = await aiAdminService.updateSystemConfig({
        embeddingProvider: embProvider,
        embeddingModel: emb,
        documentChunkSize: chunkSize,
        documentChunkOverlap: chunkOverlap,
        llmProvider: sysConfig?.llmProvider ?? undefined,
        baseUrl: sysConfig?.baseUrl ?? undefined,
        model: sysConfig?.model ?? undefined,
      });
      await refreshSysConfig();
      return r;
    });
  }

  // ---- Vector DB handlers ----
  const providerById = (id: string) => vectorDbCatalog.find((p) => p.id === id)!;
  const isVdbActive = (id: string) => activeVdbs.some((a) => a.providerId === id);

  function toggleVdbProvider(id: string) {
    if (isVdbActive(id)) { setVdb(id); return; }
    setActiveVdbs((a) => [...a, { providerId: id, fields: {} }]);
    setVdb(id);
  }

  function removeVdb(id: string) {
    if (id === "lancedb") return;
    setActiveVdbs((a) => a.filter((x) => x.providerId !== id));
    if (vdb === id) setVdb(activeVdbs.find((x) => x.providerId !== id)?.providerId || "lancedb");
  }

  function updateVdbField(providerId: string, key: string, value: string) {
    setActiveVdbs((arr) => arr.map((a) => a.providerId === providerId ? { ...a, fields: { ...a.fields, [key]: value } } : a));
  }

  function saveVdb() {
    const active = activeVdbs.find((a) => a.providerId === vdb);
    triggerSave("vdb", async () => {
      const r = await aiAdminService.updateSystemConfig({
        vectorDb: vdb,
        vectorDbEndpoint: active?.fields?.url || "",
        vectorDbApiKey: active?.fields?.key || undefined,
        llmProvider: sysConfig?.llmProvider ?? undefined,
        baseUrl: sysConfig?.baseUrl ?? undefined,
        model: sysConfig?.model ?? undefined,
        embeddingProvider: sysConfig?.embeddingProvider ?? undefined,
        embeddingModel: sysConfig?.embeddingModel ?? undefined,
        documentChunkSize: chunkSize,
        documentChunkOverlap: chunkOverlap,
      });
      await refreshSysConfig();
      return r;
    });
  }

  // ---- Document handlers ----
  function openCreate() {
    setDocEditor({ mode: "create", name: "", workspace: uploadTarget || wsSlugs[0] || "default", content: "" });
  }

  function openEdit(d: DisplayDoc) {
    if (d.status === "processing") {
      toast.error("Không thể chỉnh sửa — tài liệu đang được xử lý");
      return;
    }
    const content = docContentCache[d.name];
    if (!content) {
      toast.error("Không thể chỉnh sửa tài liệu này — nội dung không khả dụng");
      return;
    }
    setDocEditor({ mode: "edit", name: d.name, workspace: d.workspace, content, originalDocpath: d.docpath });
  }

  async function openView(d: DisplayDoc) {
    const cached = docContentCache[d.name];
    if (cached) {
      setViewDoc({ name: d.name, content: cached, workspace: d.workspace });
      return;
    }
    if (d.status === "processing" || d.status === "failed") {
      setViewDoc({ name: d.name, content: d.status === "processing" ? "Tài liệu đang được xử lý — vui lòng thử lại sau." : "Tài liệu không khả dụng do lỗi xử lý.", workspace: d.workspace });
      return;
    }
    setViewDoc({ name: d.name, content: "", workspace: d.workspace, loading: true });
    try {
      const res = await aiAdminService.getDocumentContent(d.workspace, d.name);
      if (res?.result != null) {
        setDocContentCache((c) => ({ ...c, [d.name]: res.result }));
        setViewDoc({ name: d.name, content: res.result, workspace: d.workspace, loading: false });
      } else {
        setViewDoc({ name: d.name, content: "Không thể tải nội dung tài liệu.", workspace: d.workspace, loading: false });
      }
    } catch (e: any) {
      const msg = e?.message || "";
      setViewDoc({ name: d.name, content: msg ? `Lỗi: ${msg}` : "Không thể tải nội dung tài liệu.", workspace: d.workspace, loading: false });
    }
  }

  async function saveDoc() {
    if (!docEditor) return;
    const name = normalizeName(docEditor.name);
    setUploading(true);
    try {
      const blob = new Blob([docEditor.content || ""], { type: "text/markdown" });
      const file = new File([blob], name, { type: "text/markdown" });
      if (docEditor.mode === "edit" && docEditor.originalDocpath) {
        await aiAdminService.deleteDocument(docEditor.originalDocpath).catch(() => {});
      }
      await aiAdminService.uploadDocument(file, docEditor.workspace);
      setDocContentCache((c) => ({ ...c, [name]: docEditor.content || "" }));
      optimisticReady.current.add(name);
      const fresh = await aiAdminService.getDocuments();
      if (fresh?.result) setDocs(fresh.result);
      setDocEditor(null);
      toast.success(`Đã ${docEditor.mode === "create" ? "tạo" : "cập nhật"} ${name}`);
      pollDocsReady();
    } catch {
      toast.error(`Không thể ${docEditor.mode === "create" ? "tạo" : "cập nhật"} tài liệu`);
    } finally {
      setUploading(false);
    }
  }

  async function doDelete() {
    if (!confirmDel || !confirmDel.docpath) return;
    try {
      await aiAdminService.deleteDocument(confirmDel.docpath);
      setDocs((d) => d.filter((x) => x.docpath !== confirmDel.docpath));
      setDocContentCache((c) => {
        const copy = { ...c };
        delete copy[confirmDel.name];
        return copy;
      });
      setConfirmDel(null);
      toast.success(`Đã xoá ${confirmDel.name}`);
    } catch {
      toast.error(`Không thể xoá ${confirmDel.name}`);
    }
  }

  // ─── Drag & Drop Upload ─────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);

  async function uploadFileList(files: FileList) {
    const target = uploadTarget || wsSlugs[0];
    if (!target) { toast.error("Không có workspace nào để upload"); return; }
    setUploading(true);
    let ok = 0, fail = 0;
    const uploadNames: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".md")) { fail++; continue; }
      try {
        await aiAdminService.uploadDocument(file, target);
        file.text().then((text) => setDocContentCache((c) => ({ ...c, [file.name]: text })));
        uploadNames.push(file.name);
        ok++;
      } catch { fail++; }
    }
    const fresh = await aiAdminService.getDocuments().catch(() => null);
    if (fresh?.result) setDocs(fresh.result);
    if (ok > 0) uploadNames.forEach((n) => optimisticReady.current.add(n));
    setUploading(false);
    if (ok > 0) toast.success(`Đã upload ${ok} tài liệu`);
    if (fail > 0) toast.error(`${fail} tài liệu không hợp lệ (chỉ .md)`);
    if (ok > 0) pollDocsReady();
  }

  async function pollDocsReady() {
    for (let i = 0; i < 90; i++) {
      const delay = i < 10 ? 2000 : i < 30 ? 5000 : 10000;
      await new Promise((r) => setTimeout(r, delay));
      const fresh = await aiAdminService.getDocuments().catch(() => null);
      if (!fresh?.result) continue;
      setDocs(fresh.result);
      const hasProcessing = fresh.result.some((d) => d.status === "processing");
      if (!hasProcessing) {
        fresh.result.forEach((d) => optimisticReady.current.delete(d.filename));
        break;
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) uploadFileList(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function handleDragLeave() { setDragOver(false); }

  async function handleReEmbed() {
    const target = uploadTarget || undefined;
    setReembedding(true);
    try {
      await aiAdminService.reEmbedDocuments(target);
      toast.success("Re-embed hoàn tất");
    } catch {
      toast.error("Re-embed thất bại");
    } finally {
      setReembedding(false);
    }
  }

  const renderCatBtn = (c: (typeof intelConfig)[number]) => {
    const active = cat === c.key;
    return (
      <button key={c.key} onClick={() => setCat(c.key)} className={cn("flex w-full items-center border-l-[3px] px-3 py-1.5 text-[13px] font-medium text-left transition", active ? "border-indigo-500 bg-indigo-50/60 font-semibold text-indigo-700" : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
        {c.label}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex animate-pulse items-center gap-4 rounded-xl border border-slate-200 p-5">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <div className="flex gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5 text-center">
                <Skeleton className="mx-auto h-5 w-12" />
                <Skeleton className="mx-auto h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="animate-pulse space-y-1 rounded-xl border border-slate-200 p-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
          <div className="animate-pulse space-y-3 rounded-xl border border-slate-200 p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {/* connection banner */}
      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white"><Plug className="h-6 w-6" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-slate-900">AnythingLLM Engine</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" /> Đã kết nối</span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[12px] text-slate-500" title={`${sysConfig?.anythingLlmBaseUrl || "http://localhost:3001/api"} · ${versionInfo?.version || "—"}${versionInfo?.environment ? ` · ${versionInfo.environment}` : ""}${sysConfig?.hasApiKey ? " · Bearer ••••" : ""}`}>
              {sysConfig?.anythingLlmBaseUrl || "http://localhost:3001/api"} · {versionInfo?.version || "—"}
              {versionInfo?.environment ? ` · ${versionInfo.environment}` : ""}
              {sysConfig?.hasApiKey ? " · Bearer ••••" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden grid-cols-3 gap-5 sm:grid">
            {[
              { l: "Độ trễ", v: latencyStr },
              { l: "Phiên bản", v: versionInfo?.version || "—" },
              { l: "Workspace", v: String(wsCount) },
            ].map((x) => (
              <div key={x.l} className="text-center">
                <p className="text-[17px] font-semibold text-slate-900">{x.v}</p>
                <p className="text-[11px] text-slate-400">{x.l}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {testTimestamp && <span className="text-[11px] text-slate-400">Cập nhật {testTimestamp}</span>}
            <button onClick={testConnection} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
              {test === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : test === "ok" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <RefreshCw className="h-4 w-4" />}
              Kiểm tra
            </button>
          </div>
        </div>
      </Card>

      {/* health summary */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Workspace", value: String(wsCount), color: "bg-indigo-500" },
            { label: "Tài liệu", value: String(filteredDocs.length), color: "bg-emerald-500" },
            { label: "LLM", value: model || sysConfig?.model || "—", color: "bg-violet-500", mono: true },
            { label: "Embedding", value: emb || sysConfig?.embeddingModel || "—", color: "bg-amber-500", mono: true },
            { label: "Vector DB", value: sysConfig?.vectorDb || "—", color: "bg-cyan-500" },
            { label: "Kích thước đoạn", value: sysConfig?.documentChunkSize ? String(sysConfig.documentChunkSize) : "—", color: "bg-rose-400" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-slate-900">{s.value}</p>
                <p className="text-[10.5px] text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {configLoadError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-amber-800">Không thể tải cấu hình từ AnythingLLM</p>
            <p className="mt-0.5 text-[12px] text-amber-700">Vui lòng nhập thủ công các thông số bên dưới và nhấn <b>Đồng bộ cấu hình</b>.</p>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[220px_1fr]">
        {/* category nav */}
        <Card className="h-fit p-2">
          {/* Mobile: flat list */}
          <div className="flex gap-1 overflow-x-auto lg:hidden">
            {intelConfig.map((c) => {
              const active = cat === c.key;
              return (
                <button key={c.key} onClick={() => setCat(c.key)} className={cn("flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition", active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
                  <c.icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-white" : "text-slate-400")} />
                  <span className="text-[13px] font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
          {/* Desktop: grouped sections */}
          <div className="hidden lg:flex lg:flex-col">
            <div className="mb-0.5 px-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">
                <Settings className="h-3.5 w-3.5" />
                Cấu hình hệ thống
              </div>
              <div className="border-t border-slate-100" />
            </div>
            {intelConfig.filter((c) => c.group === "system").map((c) => renderCatBtn(c))}
            <div className="mb-0.5 mt-2 px-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">
                <Briefcase className="h-3.5 w-3.5" />
                Cấu hình workspace
              </div>
              <div className="border-t border-slate-100" />
            </div>
            {intelConfig.filter((c) => c.group === "workspace").map((c) => renderCatBtn(c))}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden p-5">
          {/* ---------- CONNECTION ---------- */}
          {cat === "connection" && (
            <div className="animate-fade-in">
              <h3 className="text-[14px] font-semibold text-slate-900">Kết nối AnythingLLM Engine</h3>
              <p className="text-[13px] text-slate-500">Cấu hình backend đã được thiết lập sẵn qua <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700">application.yml</code>. Các thông số dưới đây chỉ để tham khảo.</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Base URL</span>
                  <p className="mt-1 truncate font-mono text-[13px] font-medium text-slate-900" title={sysConfig?.anythingLlmBaseUrl || "http://localhost:3001/api"}>{sysConfig?.anythingLlmBaseUrl || "http://localhost:3001/api"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">API Key</span>
                  <p className="mt-1 font-mono text-[13px] font-medium text-slate-900">{sysConfig?.hasApiKey ? "••••••••" : "Không có"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Workspace mặc định</span>
                  <p className="mt-1 truncate font-mono text-[13px] font-medium text-slate-900" title={workspaces[0]?.slug || "—"}>{workspaces[0]?.slug || "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Phiên bản engine</span>
                  <p className="mt-1 truncate font-mono text-[13px] font-medium text-slate-900" title={`${versionInfo?.version || "—"} ${versionInfo?.environment ? `· ${versionInfo.environment}` : ""}`}>{versionInfo?.version || "—"} {versionInfo?.environment ? `· ${versionInfo.environment}` : ""}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-[12.5px] text-emerald-700">Kết nối thành công. Backend tự động quản lý kết nối tới AnythingLLM — không cần nhập tay.</p>
              </div>
            </div>
          )}

          {/* ---------- WORKSPACES ---------- */}
          {cat === "workspaces" && (
            <div className="animate-fade-in flex flex-1 flex-col min-h-0">
              <div className="shrink-0 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Quản lý Workspace</h3>
                  <p className="text-[13px] text-slate-500">Không gian tri thức RAG — CRUD qua API.</p>
                </div>
                <button onClick={() => switchWsTab("_create")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700"><Plus className="h-4 w-4" /> Workspace</button>
              </div>

              {/* Tab bar */}
              {wsSlugs.length > 0 && (
                <div className="shrink-0 mt-3 flex items-center gap-0.5 overflow-x-auto">
                  <button onClick={() => switchWsTab("_all")} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition", wsTab === "_all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}>Tất cả</button>
                  {wsSlugs.slice(0, 4).map((s) => (
                    <button key={s} onClick={() => switchWsTab(s)} className={cn("max-w-[120px] shrink-0 truncate rounded-lg px-3 py-1.5 font-mono text-[12px] transition", wsTab === s ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")} title={s}>{s}</button>
                  ))}
                  {wsSlugs.length > 4 && (
                    <SmartSelect
                      value={wsTab}
                      onChange={(v) => switchWsTab(v)}
                      options={wsSlugs.slice(4)}
                      placeholder={`+${wsSlugs.length - 4}`}
                      size="sm"
                      className="min-w-[60px]"
                    />
                  )}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Tab: Tất cả — collapsed list */}
              {wsTab === "_all" && (
                <div className="mt-3">
                  <SearchInput value={wsSearch} onChange={setWsSearch} placeholder="Tìm workspace…" className="mb-3 max-w-[240px]" />
                  {filteredWs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Layers className="h-10 w-10 text-slate-200" />
                      <p className="text-[13px] text-slate-400">Không tìm thấy workspace phù hợp</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredWs.map((w) => (
                        <div key={w.slug} className="group flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
                          <button onClick={() => switchWsTab(w.slug)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Layers className="h-4 w-4" /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-slate-900" title={w.name}>{w.name}</p>
                              <p className="truncate font-mono text-[11px] text-slate-400">/{w.slug}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {(w.llmProvider ?? sysConfig?.llmProvider) && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                                    <Cpu className="h-3 w-3" />{w.llmProvider ?? sysConfig?.llmProvider}
                                  </span>
                                )}
                                {(w.baseUrl ?? sysConfig?.baseUrl) && (
                                  <span className="max-w-[180px] truncate font-mono text-[10px] text-slate-400" title={w.baseUrl ?? sysConfig?.baseUrl ?? ""}>
                                    {w.baseUrl ?? sysConfig?.baseUrl}
                                  </span>
                                )}
                                {(w.model ?? sysConfig?.model) && (
                                  <span className="font-mono text-[10px] text-slate-400">{w.model ?? sysConfig?.model}</span>
                                )}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => setWsConfirmDel(w.slug)}
                            className="mt-1 shrink-0 rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                            title="Xoá workspace"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {/* Tab: Create */}
              {wsTab === "_create" && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Field label="Tên workspace mới">
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="VD: Insurance Claims" className={inputCls} autoFocus />
                  </Field>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={addWs} disabled={creatingWs || !newName.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-700 disabled:opacity-60"><Plus className="h-4 w-4" /> {creatingWs ? "Đang tạo…" : "Tạo"}</button>
                    <button onClick={() => setWsTab("_all")} className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100">Huỷ</button>
                  </div>
                </div>
              )}

              {/* Tab: Workspace detail form */}
              {wsTab !== "_all" && wsTab !== "_create" && (
                <div className="mt-3">
                  {wsTabLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      <span className="ml-2 text-[13px] text-slate-500">Đang tải cấu hình…</span>
                    </div>
                  ) : wsTabDetail ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Layers className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-slate-900" title={wsTabDetail.name || wsTab}>{wsTabDetail.name || wsTab}</p>
                          <p className="truncate font-mono text-[11px] text-slate-400">/{wsTab}</p>
                        </div>
                      </div>

                      {/* System config debug banner */}
                      {(wsTabDetail.baseUrl ?? wsTabDetail.llmProvider ?? wsTabDetail.model) && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-slate-600">
                            <span className="font-medium text-slate-700">🔧 Hệ thống:</span>
                            <span className="inline-flex items-center gap-1">
                              <Cpu className="h-3.5 w-3.5" />
                              {wsTabDetail.llmProvider ?? "—"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="max-w-[240px] truncate font-mono text-slate-500" title={wsTabDetail.baseUrl ?? ""}>
                              {wsTabDetail.baseUrl ?? "—"}
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono">{wsTabDetail.model ?? "—"}</span>
                          </div>
                        </div>
                      )}

                      {/* Section: Model */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mô hình</p>
                        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                          <div className="min-w-0">
                            <Field label="Mô hình chat">
                              <div className="flex items-stretch gap-2">
                                <div className="min-w-0 flex-1">
                                  <SmartSelect
                                    value={wsTabDirty?.model ?? wsTabDetail.chatModel ?? ""}
                                    onChange={(v) => updateWsTabField("model", v || null)}
                                    options={[
                                      { value: "", label: "— Mặc định —" },
                                      ...(detectedWsModels.length > 0
                                        ? detectedWsModels.map((m) => ({ value: m, label: m }))
                                        : wsTabDetail.chatModel
                                          ? [{ value: wsTabDetail.chatModel, label: wsTabDetail.chatModel }]
                                          : []),
                                    ]}
                                    searchable
                                    placeholder="— Mặc định —"
                                  />
                                </div>
                                <button
                                  onClick={detectWsModels}
                                  disabled={detectingWsModels}
                                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-[12px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                                  title="Quét mô hình"
                                >
                                  {detectingWsModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </button>
                              </div>
                            </Field>
                          </div>
                          <div className="min-w-0">
                            <Field label="Nhà cung cấp chat">
                              <SmartSelect
                                value={wsTabDirty?.chatProvider ?? wsTabDetail.chatProvider ?? ""}
                                onChange={(v) => updateWsTabField("chatProvider", v || null)}
                                options={[{ value: "", label: "— Mặc định —" }, ...providers]}
                                placeholder="— Mặc định —"
                              />
                            </Field>
                          </div>
                          <div className="min-w-0">
                            <Field label="Chế độ chat">
                              <SmartSelect
                                value={wsTabDirty?.chatMode ?? wsTabDetail.chatMode ?? ""}
                                onChange={(v) => updateWsTabField("chatMode", v || null)}
                                options={[
                                  { value: "", label: "— Mặc định —" },
                                  { value: "chat", label: "Chat" },
                                  { value: "query", label: "Query" },
                                ]}
                                placeholder="— Mặc định —"
                              />
                            </Field>
                          </div>
                        </div>
                      </div>

                      {/* Section: Parameters */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tham số</p>
                        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                          <div className="min-w-0">
                            <Field label="Temperature">
                              <div className="flex items-center gap-3">
                                <input type="range" min={0} max={1} step={0.05} value={wsTabDirty?.temperature ?? wsTabDetail.temperature ?? 0.7} onChange={(e) => updateWsTabField("temperature", parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                                <span className="w-10 text-right font-mono text-[12px] text-slate-600">{(wsTabDirty?.temperature ?? wsTabDetail.temperature ?? 0.7).toFixed(2)}</span>
                              </div>
                            </Field>
                          </div>
                          <div className="min-w-0">
                            <Field label="Top N (số kết quả)">
                              <input type="text" inputMode="numeric" value={wsTabDirty?.topN ?? wsTabDetail.topN ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); updateWsTabField("topN", v ? parseInt(v) : null); }} placeholder="4" className={inputCls} />
                            </Field>
                          </div>
                          <div className="min-w-0">
                            <Field label="Similarity Threshold">
                              <div className="flex items-center gap-3">
                                <input type="range" min={0} max={1} step={0.05} value={wsTabDirty?.similarityThreshold ?? wsTabDetail.similarityThreshold ?? 0.5} onChange={(e) => updateWsTabField("similarityThreshold", parseFloat(e.target.value))} className="w-full accent-indigo-600" />
                                <span className="w-10 text-right font-mono text-[12px] text-slate-600">{(wsTabDirty?.similarityThreshold ?? wsTabDetail.similarityThreshold ?? 0.5).toFixed(2)}</span>
                              </div>
                            </Field>
                          </div>
                          <div className="min-w-0">
                            <Field label="Lịch sử hội thoại">
                              <input type="text" inputMode="numeric" value={wsTabDirty?.openAiHistory ?? wsTabDetail.openAiHistory ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); updateWsTabField("openAiHistory", v ? parseInt(v) : null); }} placeholder="20" className={inputCls} />
                            </Field>
                          </div>
                        </div>
                      </div>

                      {/* Section: Customization */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tuỳ chỉnh</p>
                        <div className="space-y-3">
                          <Field label="System Prompt">
                            <textarea rows={3} value={wsTabDirty?.openAiPrompt ?? wsTabDetail.openAiPrompt ?? ""} onChange={(e) => updateWsTabField("openAiPrompt", e.target.value)} placeholder="Để trống = dùng mặc định của system" className={cn(inputCls, "resize-y font-mono text-[12px] leading-relaxed")} />
                          </Field>
                          <Field label="Phản hồi từ chối truy vấn">
                            <textarea rows={2} value={wsTabDirty?.queryRefusalResponse ?? wsTabDetail.queryRefusalResponse ?? ""} onChange={(e) => updateWsTabField("queryRefusalResponse", e.target.value)} placeholder="Phản hồi từ chối truy vấn (nếu có)" className={cn(inputCls, "resize-y font-mono text-[12px] leading-relaxed")} />
                          </Field>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <button onClick={() => setWsConfirmDel(wsTab)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Xoá</button>
                        <button
                          onClick={saveWsTab}
                          disabled={wsSavingSlug === wsTab || !wsTabDirty}
                          className={cn("inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50", wsTabDirty ? "bg-slate-900 hover:bg-slate-700" : "bg-slate-400")}
                        >
                          {wsSavingSlug === wsTab ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {wsSavingSlug === wsTab ? "Đang lưu…" : "Lưu workspace"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              </div>
            </div>
          )}

          {/* ---------- LLM ---------- */}
          {cat === "llm" && (
            <div className="animate-fade-in flex flex-1 flex-col min-h-0">
              <h3 className="shrink-0 text-[14px] font-semibold text-slate-900">Cấu hình mô hình LLM</h3>
              <p className="mb-4 shrink-0 text-[13px] text-slate-500">Chọn nhà cung cấp LLM, sau đó cấu hình URL & model.</p>

              <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[220px_1fr]">
                {/* provider list */}
                <div className="scroll-slim min-h-0 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {llmProviderCatalog.map((p) => {
                    const sel = llmProvider === p.id;
                    const isLocal = p.kind === "local";
                    return (
                      <button key={p.id} onClick={() => { setLlmProvider(p.id); setLlmUrl(providerDefaultBaseUrl[p.id] || ""); setModel(""); setDetectedLlm([]); if (p.id !== llmProvider) setLlmApiKey(""); }} className={cn("flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition", sel ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: p.color }}>{isLocal ? <Cpu className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.name}</span>
                          <span className="block text-[10.5px] text-slate-400">{isLocal ? "Tự quản" : "API"}</span>
                        </span>
                        {sel && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* detail config */}
                <div className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 p-4">
                  {llmProvider ? (
                    <>
                      {(() => {
                        const prov = llmProviderCatalog.find((p) => p.id === llmProvider);
                        return (
                          <>
                            {prov && (
                              <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: prov.color }}>{prov.kind === "local" ? <Cpu className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}</span>
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-slate-900" title={prov.name}>{prov.name}</p>
                                  <p className="truncate text-[11px] text-slate-400" title={prov.desc}>{prov.desc}</p>
                                </div>
                              </div>
                            )}
                            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                              {llmProvider === "ollama" && (
                                <div className="min-w-0">
                                  <Field label="Base URL" hint="bắt buộc">
                                    <div className="flex items-stretch gap-2">
                                      <input value={llmUrl} onChange={(e) => setLlmUrl(e.target.value)} className={cn(inputCls, "font-mono", detectingLlm && "animate-pulse")} />
                                    </div>
                                  </Field>
                                </div>
                              )}
                              <div className="min-w-0">
                                <Field label="Mô hình chat">
                                  <div className="flex items-stretch gap-2">
                                    <div className="min-w-0 flex-1"><SmartSelect value={model} onChange={setModel} options={llmOptions} searchable /></div>
                                    <button onClick={autoDetectLlm} disabled={detectingLlm} className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-[12px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40" title="Quét lại mô hình">
                                      {detectingLlm ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </Field>
                              </div>
                              {(() => {
                        const prov = llmProviderCatalog.find((p) => p.id === llmProvider);
                                return prov?.kind === "cloud" ? (
                                  <div className="min-w-0">
                                    <Field label="API Key">
                                      <input type="password" value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-••••••••" className={cn(inputCls, "font-mono")} />
                                    </Field>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                            {detectedLlm.length > 0 && (
                              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                  <p className="max-w-full truncate text-[12.5px] text-slate-600">Đã phát hiện <b className="text-slate-900">{detectedLlm.length}</b> mô hình từ <span className="inline-block max-w-[240px] truncate align-bottom font-mono text-slate-500" title={llmUrl}>{llmUrl}</span></p>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {detectedLlm.map((m) => (
                                    <button key={m} onClick={() => setModel(m)} className={cn("max-w-[180px] truncate rounded-md px-2 py-1 font-mono text-[11px] transition", model === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")} title={m}>{m}</button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      <SaveBar saving={!!saving.llm} saved={!!justSaved.llm} onSave={saveLlm} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BrainCircuit className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-[13px] font-medium text-slate-500">Chọn một nhà cung cấp LLM từ danh sách bên trái</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- EMBEDDINGS ---------- */}
          {cat === "embeddings" && (
            <div className="animate-fade-in flex flex-1 flex-col min-h-0">
              <h3 className="shrink-0 text-[14px] font-semibold text-slate-900">Mô hình Embedding</h3>
              <p className="mb-4 shrink-0 text-[13px] text-slate-500">Chọn nhà cung cấp embedding, sau đó cấu hình model cụ thể.</p>

              <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[220px_1fr]">
                {/* provider list — only Ollama supported */}
                <div className="scroll-slim min-h-0 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {embProviderCatalog.map((p) => {
                    const sel = embProvider === p.name;
                    return (
                      <button key={p.id} onClick={() => { setEmbProvider(p.id); setEmb(""); setDetectedEmb([]); }} className={cn("flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition", sel ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: p.color }}><Cpu className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.name}</span>
                          <span className="block text-[10.5px] text-slate-400">Tự quản</span>
                        </span>
                        {sel && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* detail config */}
                <div className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 p-4">
                  {embProvider ? (
                    <>
                      {(() => {
                        const prov = embProviderCatalog.find((p) => p.id === embProvider);
                        return (
                          prov && (
                            <div className="mb-4 flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: prov.color }}><Cpu className="h-4 w-4" /></span>
                            <div className="min-w-0">
                                  <p className="truncate text-[14px] font-semibold text-slate-900" title={prov.name}>{prov.name}</p>
                                  <p className="truncate text-[11px] text-slate-400" title={prov.desc}>{prov.desc}</p>
                                </div>
                              </div>
                            )
                          );
                        })()}
                        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
                          <div className="min-w-0">
                            <Field label="Mô hình Embedding">
                            <div className="flex items-stretch gap-2">
                              <div className="min-w-0 flex-1"><SmartSelect value={emb} onChange={setEmb} options={embOptions} searchable /></div>
                              <button onClick={autoDetectEmb} disabled={detectingEmb} className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-[12px] text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40" title="Quét lại mô hình">
                                {detectingEmb ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              </button>
                            </div>
                          </Field>
                          </div>
                        </div>
                      {detectedEmb.length > 0 && (
                        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <p className="mr-2 text-[12.5px] text-slate-600">Phát hiện <b className="text-slate-900">{detectedEmb.length}</b> mô hình nhúng:</p>
                            {detectedEmb.map((m) => (
                              <button key={m} onClick={() => setEmb(m)} className={cn("max-w-[180px] truncate rounded-md px-2 py-1 font-mono text-[11px] transition", emb === m ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")} title={m}>{m}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3">
                        <p className="text-[12.5px] text-amber-700">Đổi mô hình nhúng sẽ kích hoạt re-embedding. Dự kiến ~18 phút.</p>
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-[12.5px] font-medium text-slate-700">Tùy chọn chia nhỏ và tách văn bản</span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                          Kích thước đoạn văn bản tối đa cho mỗi vector. Chỉ nên thay đổi nếu bạn hiểu cách hoạt động của text splitting.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="Kích thước đoạn">
                            <input type="text" inputMode="numeric" value={chunkSize} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v) setChunkSize(Number(v)); else setChunkSize(0); }} className={inputCls} />
                            <p className="mt-1 text-[10.5px] text-slate-400">Độ dài tối đa (ký tự) cho mỗi vector. Mặc định: 1,000</p>
                          </Field>
                          <Field label="Độ chồng lấp">
                            <input type="text" inputMode="numeric" value={chunkOverlap} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v) setChunkOverlap(Number(v)); else setChunkOverlap(0); }} className={inputCls} />
                            <p className="mt-1 text-[10.5px] text-slate-400">Số ký tự chồng lấp giữa hai đoạn liền kề. Mặc định: 200</p>
                          </Field>
                        </div>
                      </div>
                      <SaveBar saving={!!saving.emb} saved={!!justSaved.emb} onSave={saveEmb} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <BrainCircuit className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-[13px] font-medium text-slate-500">Chọn một nhà cung cấp embedding từ danh sách bên trái</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- VECTOR DB ---------- */}
          {cat === "vectordb" && (
            <div className="animate-fade-in flex flex-1 flex-col min-h-0">
              <div className="flex shrink-0 items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Vector Database</h3>
                  <p className="text-[13px] text-slate-500">Chọn nhà cung cấp — bấm vào provider để thêm hoặc chọn.</p>
                </div>
                <Badge tone="brand"><Database className="h-3 w-3" /> {activeVdbs.length} đã kết nối</Badge>
              </div>

              <div className="mt-4 flex-1 min-h-0 grid gap-4 lg:grid-cols-[220px_1fr]">
                {/* catalog panel */}
                <div className="scroll-slim min-h-0 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  <SearchInput value={vdbSearch} onChange={setVdbSearch} placeholder="Tìm provider…" className="mb-1.5 px-1" />
                  {(["embedded", "self-hosted", "cloud"] as const).map((kind) => {
                    const list = filteredVdbProviders.filter((p) => p.kind === kind);
                    if (list.length === 0) return null;
                    return (
                      <div key={kind}>
                        <p className="mb-1 mt-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{kindLabel[kind]}</p>
                        {list.map((p) => {
                          const active = isVdbActive(p.id);
                          const sel = vdb === p.id;
                          return (
                            <button key={p.id} onClick={() => toggleVdbProvider(p.id)} className={cn("flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition", sel ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}>
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: p.color }}><Database className="h-3.5 w-3.5" /></span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-medium text-slate-800">{p.name}</span>
                                <span className="block text-[10.5px] text-slate-400">{kindLabel[p.kind]}</span>
                              </span>
                              {active && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* active VDB list with config */}
                <div className="min-h-0 space-y-3 overflow-y-auto">
                  {activeVdbs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center">
                      <Database className="mb-3 h-10 w-10 text-slate-200" />
                      <p className="text-[13px] font-medium text-slate-500">Chọn provider từ danh sách bên trái</p>
                    </div>
                  ) : (
                    activeVdbs.map((inst) => {
                      const p = providerById(inst.providerId);
                      const active = vdb === p.id;
                      const urlVal = inst.fields.url || inst.fields.db;
                      return (
                        <div key={p.id} className={cn("rounded-lg border transition", active ? "border-slate-300" : "border-slate-200")}>
                          <div className="flex w-full cursor-pointer items-center gap-3 px-4 py-3" onClick={() => setVdb(p.id)}>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: p.color }}><Database className="h-4 w-4" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[13px] font-medium text-slate-900" title={p.name}>{p.name}</p>
                                {p.id === "lancedb" && <Badge tone="slate">Mặc định</Badge>}
                                {active && <Badge tone="brand">Đang dùng</Badge>}
                              </div>
                              <p className="truncate text-[11px] text-slate-400" title={`${kindLabel[p.kind]}${urlVal ? ` · ${urlVal}` : ""}`}>{kindLabel[p.kind]}{urlVal ? ` · ${urlVal}` : ""}</p>
                            </div>
                            {p.id !== "lancedb" && (
                              <button onClick={(e) => { e.stopPropagation(); removeVdb(p.id); }} className="rounded p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                            )}
                          </div>
                          {/* config fields (inline, no modal) */}
                          {active && p.fields.length > 0 && (
                            <div className="border-t border-slate-100 px-4 pb-3 pt-3">
                              <div className="space-y-3">
                                {p.fields.map((f) => (
                                  <Field key={f.key} label={f.label}>
                                    <input
                                      type={f.secret ? "password" : "text"}
                                      value={inst.fields[f.key] || ""}
                                      onChange={(e) => updateVdbField(p.id, f.key, e.target.value)}
                                      placeholder={f.placeholder}
                                      className={cn(inputCls, f.secret && "font-mono")}
                                    />
                                  </Field>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <SaveBar saving={!!saving.vdb} saved={!!justSaved.vdb} onSave={saveVdb} />
                </div>
              </div>
            </div>
          )}

          {/* ---------- DOCUMENTS ---------- */}
          {cat === "documents" && (
            <div className="animate-fade-in flex flex-1 flex-col min-h-0">
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-semibold text-slate-900">
                    Tài liệu RAG <Badge tone="brand" className="ml-1.5"><FileText className="h-3 w-3" /> Chỉ Markdown</Badge>
                  </h3>
                  <SearchInput value={docSearch} onChange={setDocSearch} placeholder="Tìm tài liệu…" className="max-w-[200px]" />
                  <button onClick={async () => { const f = await aiAdminService.getDocuments().catch(() => null); if (f?.result) { setDocs(f.result); f.result.forEach((d) => { if (d.status === "ready" || d.status === "embedded" || d.status === "failed") optimisticReady.current.delete(d.filename); }); } }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><RefreshCw className="h-4 w-4" /></button>
                </div>
                <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tạo tài liệu</Button>
              </div>
              <p className="shrink-0 text-[13px] text-slate-500 mt-1">Quản lý tài liệu RAG — upload, tạo mới, xem, sửa và xoá.</p>

              <div className="grid shrink-0 mt-3 gap-3" style={{ gridTemplateColumns: "3fr 1fr" }}>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById("doc-file-input")?.click()}
                  className={cn(
                    "relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition",
                    dragOver ? "border-indigo-400 bg-indigo-50/70" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <input
                    id="doc-file-input"
                    type="file"
                    accept=".md"
                    multiple
                    className="hidden"
                    onChange={(e) => { if (e.target.files && e.target.files.length > 0) uploadFileList(e.target.files); }}
                  />
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-[13px] text-indigo-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lên…
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Upload className="h-6 w-6 shrink-0 text-slate-300" />
                      <p className="text-[13px] text-slate-500">
                        Kéo thả file <b className="text-slate-600">.md</b> vào đây &middot; hoặc{" "}
                        <button type="button" onClick={(e) => { e.stopPropagation(); document.getElementById("doc-file-input")?.click(); }} className="font-medium text-indigo-600 underline-offset-2 hover:underline">chọn từ máy</button>
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-slate-600">Chọn workspace</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SmartSelect
                      value={uploadTarget}
                      onChange={setUploadTarget}
                      options={wsSlugs}
                      className="w-full"
                      size="sm"
                    />
                  </div>
                  <button
                    onClick={() => setReembedConfirm(true)}
                    disabled={reembedding}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {reembedding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {reembedding ? "Đang re-embed…" : "Re-embed"}
                  </button>
                </div>
              </div>

              {/* Document list */}
              <div className="flex-1 min-h-0 overflow-y-auto mt-3">
                <div className="space-y-1.5">
                  {filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <FileText className="h-10 w-10 text-slate-200" />
                      <p className="text-[13px] text-slate-400">Chưa có tài liệu nào.</p>
                    </div>
                  ) : (
                    filteredDocs.map((d) => (
                      <div key={d.id} className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition hover:bg-slate-50">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          {d.status === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : <FileText className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-slate-800" title={d.name}>{d.name}</p>
                          <p className="truncate font-mono text-[11px] text-slate-400" title={`${d.workspace} · ${d.size}`}>{d.workspace} · {d.size}</p>
                        </div>
                        <Badge tone={d.status === "ready" ? "emerald" : d.status === "processing" ? "amber" : "rose"}>
                          {d.status === "ready" ? "Sẵn sàng" : d.status === "processing" ? "Đang xử lý" : "Lỗi"}
                        </Badge>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openView(d)} title="Xem" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Eye className="h-3.5 w-3.5" /></button>
                          <button onClick={() => openEdit(d)} title="Sửa" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setConfirmDel({ name: d.name, workspace: d.workspace, docpath: d.docpath })} title="Xoá" className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ===== View document ===== */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.name || ""} desc={viewDoc ? `Workspace · ${viewDoc.workspace}` : ""} size="lg">
        {viewDoc?.loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <MarkdownView content={viewDoc?.content || ""} />
        )}
      </Modal>

      <DocEditorModal
        open={!!docEditor}
        editor={docEditor}
        uploading={uploading}
        workspaces={wsSlugs}
        onSave={saveDoc}
        onClose={() => setDocEditor(null)}
        onChange={(patch) => setDocEditor((s) => (s ? { ...s, ...patch } : s))}
      />

      {/* ===== Workspace delete confirm ===== */}
      <Modal
        open={!!wsConfirmDel}
        onClose={() => setWsConfirmDel(null)}
        title="Xoá workspace?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWsConfirmDel(null)}>Huỷ</Button>
            <button onClick={() => wsConfirmDel && deleteWs(wsConfirmDel)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700"><Trash2 className="h-4 w-4" /> Xoá</button>
          </>
        }
      >
          <p className="text-[13px] leading-relaxed text-slate-600">
           Workspace <b className="inline-block max-w-[240px] truncate align-bottom text-slate-900" title={wsConfirmDel ?? undefined}>{wsConfirmDel}</b> sẽ bị xoá vĩnh viễn. Tài liệu trong workspace này cũng sẽ bị gỡ khỏi vector DB. Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {/* ===== Re-embed confirm ===== */}
      <Modal
        open={reembedConfirm}
        onClose={() => setReembedConfirm(false)}
        title="Re-embed toàn bộ tài liệu?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReembedConfirm(false)}>Huỷ</Button>
            <button onClick={() => { setReembedConfirm(false); handleReEmbed(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-amber-700"><RefreshCw className="h-4 w-4" /> Re-embed</button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-slate-600">
          Toàn bộ tài liệu sẽ được nhúng lại vector DB. Quá trình này có thể mất vài phút và không thể hoàn tác giữa chừng.
        </p>
      </Modal>

      {/* ===== Delete document confirm ===== */}
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
          Tài liệu <b className="inline-block max-w-[180px] truncate align-bottom text-slate-900" title={confirmDel?.name}>{confirmDel?.name}</b> sẽ bị gỡ khỏi workspace{" "}
          <span className="inline-block max-w-[160px] truncate align-bottom font-mono text-slate-500" title={confirmDel?.workspace}>{confirmDel?.workspace}</span> và xoá khỏi vector DB. Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}
