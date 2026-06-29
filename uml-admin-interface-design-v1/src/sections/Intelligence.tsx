import { useState } from "react";
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
  embeddingModels,
  intelConfig,
  llmProviders,
  ollamaEmbModels,
  ollamaLlmModels,
  ragDocs,
  vectorDbCatalog,
  workspaces as seedWorkspaces,
  type RagDoc,
} from "@/data/mock";
import { Badge, Button, Card, EndpointBadge } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { MarkdownEditor, MarkdownView } from "@/components/MarkdownView";
import { cn } from "@/utils/cn";

type CatKey = (typeof intelConfig)[number]["key"];
type VdbInstance = { providerId: string; fields: Record<string, string> };

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

function SaveBar({ endpoint }: { endpoint: { method: "POST" | "PUT"; path: string } }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <EndpointBadge method={endpoint.method} path={endpoint.path} />
      <button
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}
        className={cn("inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition", saved ? "bg-emerald-600" : "bg-slate-900 hover:bg-slate-700")}
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Đã đồng bộ" : "Đồng bộ cấu hình"}
      </button>
    </div>
  );
}

const apiCalls = [
  { m: "POST", p: "/api/v1/workspaces", s: 201, t: "412ms" },
  { m: "GET", p: "/api/v1/system/preferences", s: 200, t: "86ms" },
  { m: "POST", p: "/api/v1/document/upload", s: 200, t: "1,8s" },
  { m: "POST", p: "/api/v1/workspace/banking-sdlc/chat", s: 200, t: "1,2s" },
  { m: "DELETE", p: "/api/v1/workspace/legacy-svc", s: 204, t: "120ms" },
  { m: "PUT", p: "/api/v1/system/preferences", s: 200, t: "94ms" },
] as const;

export default function Intelligence() {
  const [cat, setCat] = useState<CatKey>("connection");
  const [ws, setWs] = useState(seedWorkspaces);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [temp, setTemp] = useState(0.7);
  const [test, setTest] = useState<"idle" | "loading" | "ok">("ok");

  // ---- LLM ----
  const [llmProvider, setLlmProvider] = useState("Ollama");
  const [llmUrl, setLlmUrl] = useState("http://127.0.0.1:11434");
  const [model, setModel] = useState("llama3.1:8b");
  const [detectedLlm, setDetectedLlm] = useState<string[]>([]);
  const [detectingLlm, setDetectingLlm] = useState(false);

  // ---- Embedding ----
  const [embProvider, setEmbProvider] = useState("Ollama");
  const [emb, setEmb] = useState(embeddingModels[0]);
  const [detectedEmb, setDetectedEmb] = useState<string[]>([]);
  const [detectingEmb, setDetectingEmb] = useState(false);

  // ---- Vector DB ----
  const [activeVdbs, setActiveVdbs] = useState<VdbInstance[]>([{ providerId: "lancedb", fields: {} }]);
  const [vdb, setVdb] = useState("lancedb");
  const [vdbModal, setVdbModal] = useState(false);
  const [vdbPick, setVdbPick] = useState("chroma");
  const [vdbForm, setVdbForm] = useState<Record<string, string>>({});

  // ---- Documents ----
  const [docs, setDocs] = useState<RagDoc[]>(ragDocs);
  const [docWs, setDocWs] = useState("all");
  const [docSearch, setDocSearch] = useState("");
  const [viewDoc, setViewDoc] = useState<RagDoc | null>(null);
  const [docEditor, setDocEditor] = useState<{ mode: "create" | "edit"; doc?: RagDoc; name: string; workspace: string; content: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<RagDoc | null>(null);

  const wsSlugs = seedWorkspaces.map((w) => w.slug);
  const canDetectLlm = localProviders.includes(llmProvider);
  const canDetectEmb = localProviders.includes(embProvider);
  const llmOptions = detectedLlm.length ? detectedLlm : ["llama3.1:8b", "qwen2.5:7b", "mistral-nemo", "phi3:mini"];
  const embOptions = detectedEmb.length ? detectedEmb : embeddingModels;
  const filteredDocs = docs.filter(
    (d) => (docWs === "all" || d.workspace === docWs) && d.name.toLowerCase().includes(docSearch.toLowerCase())
  );

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function addWs() {
    if (!newName.trim()) return;
    setWs((w) => [{ id: Date.now(), name: newName, slug: slugify(newName), docs: 0, vectors: "0", model, updated: "Vừa tạo" }, ...w]);
    setNewName("");
    setShowCreate(false);
  }

  function autoDetectLlm() {
    setDetectingLlm(true);
    setDetectedLlm([]);
    setTimeout(() => { setDetectedLlm(ollamaLlmModels); setModel(ollamaLlmModels[0]); setDetectingLlm(false); }, 1400);
  }
  function autoDetectEmb() {
    setDetectingEmb(true);
    setDetectedEmb([]);
    setTimeout(() => { setDetectedEmb(ollamaEmbModels); setEmb(ollamaEmbModels[0]); setDetectingEmb(false); }, 1400);
  }

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

  function normalizeName(n: string) {
    let s = (n.trim() || "tai-lieu").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9._-]+/g, "-");
    if (!s.endsWith(".md")) s += ".md";
    return s;
  }
  function openCreate() {
    setDocEditor({ mode: "create", name: "", workspace: wsSlugs[0], content: "# Tên tài liệu\n\nMô tả nội dung..." });
  }
  function openEdit(d: RagDoc) {
    setDocEditor({ mode: "edit", doc: d, name: d.name, workspace: d.workspace, content: d.content });
  }
  function saveDoc() {
    if (!docEditor) return;
    const name = normalizeName(docEditor.name);
    if (docEditor.mode === "create") {
      const id = Date.now();
      const newDoc: RagDoc = { id, name, workspace: docEditor.workspace, size: "—", status: "processing", content: docEditor.content || "" };
      setDocs((d) => [newDoc, ...d]);
      setDocEditor(null);
      setTimeout(() => setDocs((d) => d.map((x) => x.id === id ? { ...x, status: "ready", size: `${(Math.random() * 3 + 0.4).toFixed(1)} KB` } : x)), 1400);
    } else if (docEditor.doc) {
      const id = docEditor.doc.id;
      setDocs((d) => d.map((x) => x.id === id ? { ...x, name, workspace: docEditor.workspace, content: docEditor.content || "", size: `${Math.max(0.2, docEditor.content.length / 1024).toFixed(1)} KB` } : x));
      setDocEditor(null);
    }
  }
  function doDelete() {
    if (!confirmDel) return;
    setDocs((d) => d.filter((x) => x.id !== confirmDel.id));
    setConfirmDel(null);
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
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">http://localhost:3001/api · v1.8.5 · Bearer ••••7f2a</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden grid-cols-3 gap-5 sm:grid">
            {[{ l: "Độ trễ", v: "1,2s" }, { l: "Vector", v: "5,8M" }, { l: "Workspace", v: String(ws.length) }].map((x) => (
              <div key={x.l} className="text-center">
                <p className="text-[17px] font-semibold text-slate-900">{x.v}</p>
                <p className="text-[11px] text-slate-400">{x.l}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setTest("loading"); setTimeout(() => setTest("ok"), 1100); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
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
              const Icon = c.icon;
              const active = cat === c.key;
              return (
                <button key={c.key} onClick={() => setCat(c.key)} className={cn("flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition lg:w-full", active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>
                  <Icon className={cn("h-[17px] w-[17px]", active ? "text-white" : "text-slate-400")} />
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
                <Field label="Base URL"><input defaultValue="http://localhost:3001/api" className={cn(inputCls, "font-mono")} /></Field>
                <Field label="API Key" hint="Bearer"><input defaultValue="allm_sk_••••7f2a" type="password" className={cn(inputCls, "font-mono")} /></Field>
                <Field label="Timeout (ms)"><input defaultValue="30000" className={inputCls} /></Field>
                <Field label="Tự động đồng bộ"><Select value="Mỗi 5 phút" onChange={() => {}} options={["Mỗi 1 phút", "Mỗi 5 phút", "Mỗi 15 phút", "Tắt"]} /></Field>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-[12.5px] text-emerald-700">Kết nối thành công. Phiên bản <b>1.8.5</b>, hỗ trợ streaming chat & RAG multi-workspace.</p>
              </div>
              <SaveBar endpoint={{ method: "POST", path: "/api/v1/system" }} />
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
                      <th className="px-3 py-2 text-right font-semibold">Tài liệu</th>
                      <th className="px-3 py-2 text-right font-semibold">Vector</th>
                      <th className="px-3 py-2 font-semibold">Model</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ws.map((w) => (
                      <tr key={w.id} className="group transition hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Layers className="h-4 w-4" /></span>
                            <div>
                              <p className="text-[13px] font-medium text-slate-900">{w.name}</p>
                              <p className="font-mono text-[11px] text-slate-400">/{w.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-slate-900">{w.docs}</td>
                        <td className="px-3 py-2.5 text-right text-[13px] text-slate-600">{w.vectors}</td>
                        <td className="px-3 py-2.5"><Badge tone="brand">{w.model}</Badge></td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end opacity-0 transition group-hover:opacity-100">
                            <button className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => setWs((arr) => arr.filter((x) => x.id !== w.id))}><Trash2 className="h-4 w-4" /></button>
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
                <Field label="LLM Provider"><Select value={llmProvider} onChange={setLlmProvider} options={llmProviders} /></Field>
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
              <SaveBar endpoint={{ method: "POST", path: "/api/v1/system/preferences" }} />
            </div>
          )}

          {/* ---------- EMBEDDINGS ---------- */}
          {cat === "embeddings" && (
            <div className="animate-fade-in">
              <h3 className="text-[14px] font-semibold text-slate-900">Mô hình Embedding</h3>
              <p className="text-[13px] text-slate-500">Đổi embedder sẽ cần re-embed toàn bộ corpus.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Provider"><Select value={embProvider} onChange={setEmbProvider} options={["Ollama", "LocalAI", "Sentence Transformers", "OpenAI"]} /></Field>
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
                <p className="text-[12.5px] text-amber-700">Đổi mô hình nhúng sẽ kích hoạt re-embedding <b>5,8M vector</b>. Dự kiến ~18 phút.</p>
              </div>
              <SaveBar endpoint={{ method: "PUT", path: "/api/v1/system/preferences" }} />
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
              <SaveBar endpoint={{ method: "PUT", path: "/api/v1/system/preferences" }} />
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
                      <button onClick={() => setViewDoc(d)} disabled={d.status !== "ready"} title="Xem" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(d)} title="Sửa" className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmDel(d)} title="Xoá" className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
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

      {/* API monitor */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-slate-900">Giám sát API theo thời gian thực</h3>
          <Badge tone="emerald"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" /> 6/6 thành công</Badge>
        </div>
        <div className="space-y-1">
          {apiCalls.map((c, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50">
              <EndpointBadge method={c.m} path={c.p} />
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:block">
                  <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, 100 - parseInt(c.t) / 2)}%` }} />
                </span>
                <Badge tone="emerald">{c.s}</Badge>
                <span className="w-12 text-right font-mono text-[12px] text-slate-500">{c.t}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

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
              <div className="flex-1"><Select value={docEditor?.workspace || wsSlugs[0]} onChange={(v) => setDocEditor((s) => (s ? { ...s, workspace: v } : s))} options={wsSlugs} /></div>
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
