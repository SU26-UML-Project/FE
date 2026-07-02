import {
  Boxes,
  BrainCircuit,
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  HeartPulse,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  type LucideIcon,
  MessagesSquare,
  ScrollText,
  ShoppingBag,
  Users,
  Cloud,
  Cpu,
} from "lucide-react";

/* ----------------------------- Navigation ----------------------------- */
export type SectionId =
  | "dashboard"
  | "users"
  | "projects"
  | "intelligence"
  | "operation"
  | "subscription"
  | "audit";

export type NavSection = {
  id: string;
  hint: string;
  items: { id: SectionId; label: string; sub: string; icon: LucideIcon }[];
};

export const navSections: NavSection[] = [
  {
    id: "overview",
    hint: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        sub: "Trung tâm điều khiển",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "manage",
    hint: "Management",
    items: [
      { id: "users", label: "Người dùng", sub: "Users", icon: Users },
      { id: "projects", label: "Dự án", sub: "Projects", icon: FolderKanban },
    ],
  },
  {
    id: "intel",
    hint: "Intelligence",
    items: [
      {
        id: "intelligence",
        label: "AI Engine",
        sub: "AnythingLLM · Local RAG",
        icon: BrainCircuit,
      },
    ],
  },
  {
    id: "ops",
    hint: "Operation",
    items: [
      {
        id: "operation",
        label: "Mẫu Workspace",
        sub: "Templates · Knowledge",
        icon: LayoutTemplate,
      },
      {
        id: "subscription",
        label: "Gói Subscription",
        sub: "Plans · Features",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "system",
    hint: "System",
    items: [
      {
        id: "audit",
        label: "Nhật ký hệ thống",
        sub: "Audit log",
        icon: ScrollText,
      },
    ],
  },
];

/* ----------------------------- Dashboard ----------------------------- */
export const projectsTrend = [
  { m: "T1", v: 64 },
  { m: "T2", v: 72 },
  { m: "T3", v: 68 },
  { m: "T4", v: 91 },
  { m: "T5", v: 84 },
  { m: "T6", v: 108 },
  { m: "T7", v: 99 },
  { m: "T8", v: 132 },
  { m: "T9", v: 121 },
  { m: "T10", v: 148 },
  { m: "T11", v: 162 },
  { m: "T12", v: 188 },
];

export const umlDistribution = [
  { label: "Class Diagram", value: 28, color: "#6366f1" },
  { label: "Use Case", value: 22, color: "#0ea5e9" },
  { label: "Sequence", value: 18, color: "#8b5cf6" },
  { label: "Activity", value: 14, color: "#f59e0b" },
  { label: "ERD", value: 10, color: "#10b981" },
  { label: "Khác", value: 8, color: "#94a3b8" },
];

export type ActivityItem = {
  id: number;
  who: string;
  initials: string;
  action: string;
  target: string;
  time: string;
};

export const activityFeed: ActivityItem[] = [
  { id: 1, who: "Nguyễn Minh Anh", initials: "NA", action: "tạo sơ đồ Class mới trong", target: "Core Banking v3", time: "2 phút trước" },
  { id: 2, who: "AnythingLLM", initials: "AI", action: "đồng bộ workspace", target: "banking-sdlc", time: "11 phút trước" },
  { id: 3, who: "Trần Quốc Bảo", initials: "TB", action: "tải tài liệu vào", target: "E-commerce Platform", time: "34 phút trước" },
  { id: 4, who: "Lê Hoàng Yến", initials: "LY", action: "mời 3 thành viên vào", target: "Healthcare Portal", time: "1 giờ trước" },
  { id: 5, who: "Phạm Đức Hoàng", initials: "PH", action: "clone mẫu workspace", target: "Hospital System", time: "2 giờ trước" },
];

export const topContributors = [
  { name: "Nguyễn Minh Anh", diagrams: 412, initials: "NA", color: "#6366f1" },
  { name: "Trần Quốc Bảo", diagrams: 388, initials: "TB", color: "#0ea5e9" },
  { name: "Lê Hoàng Yến", diagrams: 301, initials: "LY", color: "#8b5cf6" },
  { name: "Phạm Đức Hoàng", diagrams: 274, initials: "PH", color: "#10b981" },
  { name: "Võ Thanh Tùng", diagrams: 219, initials: "VT", color: "#f59e0b" },
];

/* ----------------------------- Users ----------------------------- */
export type Role = "Admin" | "Manager" | "Member" | "Viewer";
export type UserStatus = "active" | "pending" | "suspended";

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  projects: number;
  diagrams: number;
  lastActive: string;
  initials: string;
  color: string;
};

export const users: PlatformUser[] = [
  { id: 1, name: "Nguyễn Minh Anh", email: "minhanh@uml.studio", role: "Admin", status: "active", projects: 28, diagrams: 412, lastActive: "Đang hoạt động", initials: "NA", color: "#6366f1" },
  { id: 2, name: "Trần Quốc Bảo", email: "quocbao@uml.studio", role: "Manager", status: "active", projects: 19, diagrams: 388, lastActive: "5 phút trước", initials: "TB", color: "#0ea5e9" },
  { id: 3, name: "Lê Hoàng Yến", email: "hoangyen@uml.studio", role: "Manager", status: "active", projects: 15, diagrams: 301, lastActive: "22 phút trước", initials: "LY", color: "#8b5cf6" },
  { id: 4, name: "Phạm Đức Hoàng", email: "duchoang@uml.studio", role: "Member", status: "active", projects: 9, diagrams: 274, lastActive: "1 giờ trước", initials: "PH", color: "#10b981" },
  { id: 5, name: "Võ Thanh Tùng", email: "thanhtung@uml.studio", role: "Member", status: "pending", projects: 4, diagrams: 96, lastActive: "Hôm qua", initials: "VT", color: "#f59e0b" },
  { id: 6, name: "Đặng Khánh Linh", email: "khanhlinh@uml.studio", role: "Viewer", status: "active", projects: 2, diagrams: 41, lastActive: "2 ngày trước", initials: "KL", color: "#ef4444" },
  { id: 7, name: "Bùi Tấn Phát", email: "tanphat@uml.studio", role: "Member", status: "suspended", projects: 6, diagrams: 133, lastActive: "1 tuần trước", initials: "TP", color: "#64748b" },
  { id: 8, name: "Hồ Gia Hân", email: "giahan@uml.studio", role: "Member", status: "active", projects: 11, diagrams: 205, lastActive: "12 phút trước", initials: "GH", color: "#14b8a6" },
];

/* ----------------------------- Projects ----------------------------- */
export type Project = {
  id: number;
  name: string;
  owner: string;
  category: string;
  diagrams: number;
  members: number;
  status: "on-track" | "at-risk" | "draft";
  updated: string;
};

export const projects: Project[] = [
  { id: 1, name: "Core Banking System", owner: "Nguyễn Minh Anh", category: "Banking", diagrams: 64, members: 12, status: "on-track", updated: "2 giờ trước" },
  { id: 2, name: "E-commerce Platform", owner: "Trần Quốc Bảo", category: "Retail", diagrams: 48, members: 8, status: "on-track", updated: "Hôm qua" },
  { id: 3, name: "Healthcare Portal", owner: "Lê Hoàng Yến", category: "Healthcare", diagrams: 37, members: 6, status: "at-risk", updated: "3 ngày trước" },
  { id: 4, name: "Logistics Tracker", owner: "Phạm Đức Hoàng", category: "Logistics", diagrams: 29, members: 5, status: "on-track", updated: "1 tuần trước" },
  { id: 5, name: "FinTech Wallet", owner: "Hồ Gia Hân", category: "Fintech", diagrams: 41, members: 7, status: "draft", updated: "5 ngày trước" },
  { id: 6, name: "EdTech LMS", owner: "Võ Thanh Tùng", category: "Education", diagrams: 22, members: 4, status: "on-track", updated: "Hôm nay" },
];

/* ----------------------------- Intelligence (AnythingLLM) ----------------------------- */
export type LlmWorkspace = {
  id: number;
  name: string;
  slug: string;
  docs: number;
  vectors: string;
  model: string;
  updated: string;
};

export const workspaces: LlmWorkspace[] = [
  { id: 1, name: "Banking SDLC Knowledge", slug: "banking-sdlc", docs: 248, vectors: "1,9M", model: "llama3.1:8b", updated: "12 phút trước" },
  { id: 2, name: "E-commerce Patterns", slug: "ecommerce-patterns", docs: 132, vectors: "940k", model: "qwen2.5:7b", updated: "1 giờ trước" },
  { id: 3, name: "Hospital Compliance", slug: "hospital-hl7", docs: 97, vectors: "612k", model: "llama3.1:8b", updated: "Hôm qua" },
  { id: 4, name: "UML Reference Library", slug: "uml-reference", docs: 410, vectors: "2,4M", model: "mistral-nemo", updated: "5 phút trước" },
];

export const intelConfig = [
  { key: "connection", label: "Kết nối", desc: "Endpoint & API key", icon: Cloud, group: "system" },
  { key: "llm", label: "Mô hình LLM", desc: "Provider & tham số", icon: BrainCircuit, group: "system" },
  { key: "embeddings", label: "Embedding", desc: "Mô hình nhúng vector", icon: Cpu, group: "system" },
  { key: "vectordb", label: "Vector Database", desc: "Kho lưu trữ vector", icon: Database, group: "system" },
  { key: "workspaces", label: "Workspaces", desc: "Không gian tri thức RAG", icon: Layers, group: "workspace" },
  { key: "documents", label: "Tài liệu RAG", desc: "Nguồn dữ liệu ingest", icon: FileText, group: "workspace" },
] as const;

export const llmProviders = ["Ollama", "LM Studio", "LocalAI", "OpenAI", "Anthropic", "Groq"];
export const embeddingModels = ["nomic-embed-text", "mxbai-embed-large", "bge-large-en", "all-MiniLM-L6"];

/** Các mô hình có thể phát hiện được khi quét engine local (Ollama /api/tags) */
export const ollamaLlmModels = [
  "llama3.1:8b",
  "qwen2.5:7b",
  "mistral-nemo",
  "phi3:mini",
  "gemma2:9b",
  "deepseek-r1:7b",
];
export const ollamaEmbModels = [
  "nomic-embed-text",
  "mxbai-embed-large",
  "bge-m3",
  "all-minilm",
  "snowflake-arctic-embed",
];

/* ---- Toàn bộ nhà cung cấp Vector DB mà AnythingLLM hỗ trợ ---- */
export type VectorDbField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
};

export type VectorDbProvider = {
  id: string;
  name: string;
  kind: "embedded" | "self-hosted" | "cloud";
  desc: string;
  fields: VectorDbField[];
  color: string;
};

export const vectorDbCatalog: VectorDbProvider[] = [
  { id: "lancedb", name: "LanceDB", kind: "embedded", desc: "Vector DB nhúng sẵn, chạy trực tiếp trong AnythingLLM. Không cần cấu hình.", fields: [], color: "#6366f1" },
  { id: "chroma", name: "Chroma", kind: "self-hosted", desc: "Mã nguồn mở, chạy local hoặc qua Docker.", fields: [{ key: "url", label: "Chroma Server URL", placeholder: "http://localhost:8000" }], color: "#10b981" },
  { id: "pinecone", name: "Pinecone", kind: "cloud", desc: "Vector database được quản lý hoàn toàn trên đám mây.", fields: [{ key: "key", label: "API Key", placeholder: "pc-xxxxxxxx", secret: true }, { key: "env", label: "Environment", placeholder: "gcp-starter" }], color: "#0ea5e9" },
  { id: "weaviate", name: "Weaviate", kind: "self-hosted", desc: "Hỗ trợ self-hosted và Weaviate Cloud Services.", fields: [{ key: "url", label: "Cluster URL", placeholder: "https://cluster.weaviate.network" }, { key: "key", label: "API Key", placeholder: "w••••••••", secret: true }], color: "#22d3ee" },
  { id: "qdrant", name: "Qdrant", kind: "self-hosted", desc: "Hiệu năng cao, có Qdrant Cloud hoặc self-host.", fields: [{ key: "url", label: "Qdrant URL", placeholder: "http://localhost:6333" }, { key: "key", label: "API Key", placeholder: "qdrant-key", secret: true }], color: "#dc2626" },
  { id: "milvus", name: "Milvus / Zilliz", kind: "self-hosted", desc: "Milvus self-hosted hoặc Zilliz Cloud managed.", fields: [{ key: "url", label: "Milvus URL", placeholder: "http://localhost:19530" }, { key: "key", label: "API Key", placeholder: "zilliz-key", secret: true }], color: "#8b5cf6" },
  { id: "astra", name: "Astra DB", kind: "cloud", desc: "DataStax Astra — serverless trên nền Cassandra.", fields: [{ key: "token", label: "Application Token", placeholder: "AstraCS:...", secret: true }, { key: "db", label: "Database ID", placeholder: "uuid" }], color: "#f59e0b" },
  { id: "pgvector", name: "PG Vector", kind: "self-hosted", desc: "Tiện ích vector ngay trong PostgreSQL.", fields: [{ key: "url", label: "Connection String", placeholder: "postgresql://user:pass@host/db" }, { key: "key", label: "Password", placeholder: "••••••", secret: true }], color: "#2563eb" },
  { id: "redis", name: "Redis", kind: "self-hosted", desc: "RediSearch chạy trên Redis Stack.", fields: [{ key: "url", label: "Redis URL", placeholder: "redis://localhost:6379" }, { key: "key", label: "Password", placeholder: "••••••", secret: true }], color: "#ef4444" },
];

export type LlmProviderField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
};

export type LlmProvider = {
  id: string;
  name: string;
  kind: "local" | "cloud";
  desc: string;
  color: string;
};

export const llmProviderCatalog: LlmProvider[] = [
  { id: "ollama", name: "Ollama", kind: "local", desc: "Chạy local, mã nguồn mở. Hỗ trợ nhiều model như Llama 3, Mistral, Gemma.", color: "#6366f1" },
  { id: "lm studio", name: "LM Studio", kind: "local", desc: "Giao diện desktop, tải model từ HuggingFace, expose OpenAI-compatible API.", color: "#8b5cf6" },
  { id: "localai", name: "LocalAI", kind: "local", desc: "Self-hosted OpenAI alternative, chạy Docker hoặc binary.", color: "#a855f7" },
  { id: "openai", name: "OpenAI", kind: "cloud", desc: "GPT-4, GPT-4o, GPT-4-turbo. Yêu cầu API key từ platform.openai.com.", color: "#10b981" },
  { id: "azure", name: "Azure OpenAI", kind: "cloud", desc: "OpenAI qua Azure. Yêu cầu endpoint + API key từ Azure Portal.", color: "#0ea5e9" },
  { id: "anthropic", name: "Anthropic", kind: "cloud", desc: "Claude 3 Opus/Sonnet/Haiku. API key từ console.anthropic.com.", color: "#f59e0b" },
  { id: "google", name: "Google Gemini", kind: "cloud", desc: "Gemini Pro, Gemini 1.5. API key từ Google AI Studio.", color: "#ef4444" },
  { id: "mistral", name: "Mistral AI", kind: "cloud", desc: "Mistral Large, Medium, Small. API key từ console.mistral.ai.", color: "#2563eb" },
  { id: "groq", name: "Groq", kind: "cloud", desc: "Inference siêu nhanh với LPU. Miễn phí, API key từ console.groq.com.", color: "#22d3ee" },
  { id: "deepseek", name: "DeepSeek", kind: "cloud", desc: "DeepSeek Chat & Coder. API key từ platform.deepseek.com.", color: "#dc2626" },
  { id: "together", name: "Together AI", kind: "cloud", desc: "100+ open-source models. API key từ api.together.xyz.", color: "#14b8a6" },
  { id: "openrouter", name: "OpenRouter", kind: "cloud", desc: "Cổng kết nối nhiều providers, tự động routing. API key từ openrouter.ai.", color: "#f97316" },
  { id: "perplexity", name: "Perplexity", kind: "cloud", desc: "Sonar models. API key từ perplexity.ai/settings.", color: "#06b6d4" },
  { id: "cohere", name: "Cohere", kind: "cloud", desc: "Command R / Command R+. API key từ dashboard.cohere.com.", color: "#e11d48" },
  { id: "fireworks", name: "Fireworks AI", kind: "cloud", desc: "Fast inference. API key từ fireworks.ai.", color: "#d946ef" },
  { id: "novita", name: "Novita AI", kind: "cloud", desc: "GPU cluster for LLM inference. API key từ novita.ai.", color: "#64748b" },
];

export type RagDoc = {
  id: number;
  name: string; // luôn kết thúc bằng .md
  workspace: string;
  size: string;
  status: "ready" | "processing" | "failed";
  content: string; // nội dung markdown
};

const mdBankingReq = [
  "# Yêu cầu hệ thống — Core Banking",
  "",
  "## 1. Mô tả",
  "Hệ thống ngân hàng lõi phục vụ **mở tài khoản**, chuyển khoản nội bộ và tra cứu số dư thời gian thực.",
  "",
  "## 2. Tác nhân chính",
  "- Khách hàng (Customer)",
  "- Giao dịch viên (Teller)",
  "- Kiểm toán (Auditor)",
  "- Hệ thống thanh toán (Payment Gateway)",
  "",
  "## 3. Yêu cầu chức năng",
  "1. Mở tài khoản tiết kiệm / thanh toán",
  "2. Chuyển khoản nội bộ & liên ngân hàng",
  "3. Tra cứu số dư, sao kê",
  "4. Phê duyệt tín dụng",
  "",
  "> Mọi giao dịch phải ghi **sổ cái (ledger)** và lưu audit trail tối thiểu 7 năm.",
  "",
  "## 4. Ràng buộc tuân thủ",
  "- `PCI-DSS` cho dữ liệu thẻ",
  "- `Basel III` cho dự phòng vốn",
  "- AML / KYC khi mở tài khoản",
].join("\n");

const mdPciChecklist = [
  "# Checklist PCI-DSS",
  "",
  "## Kiểm soát truy cập",
  "- [x] Phân quyền RBAC theo vai trò",
  "- [x] Xác thực đa yếu tố (MFA) cho admin",
  "- [ ] Mã hoá dữ liệu thẻ at-rest",
  "",
  "## Mạng",
  "- Tách VLAN cho khu vực cardholder",
  "- Tường lửa giữa DMZ và core",
  "",
  "```ts",
  "// ví dụ kiểm tra quyền",
  "if (!user.can('read:card')) throw new Forbidden();",
  "```",
  "",
  "> Cập nhật checklist mỗi quý theo phiên bản PCI-DSS v4.",
].join("\n");

const mdPatientFlow = [
  "# Luồng bệnh nhân (Patient Workflow)",
  "",
  "## Tiếp nhận",
  "1. Đăng ký thông tin bệnh nhân",
  "2. Gán mã `MRN` (Medical Record Number)",
  "3. Chuyển tới phòng khám",
  "",
  "## Khám & chẩn đoán",
  "- Bác sĩ ghi nhận triệu chứng",
  "- Yêu cầu xét nghiệm / hình ảnh",
  "",
  "## Tương thích HL7 / FHIR",
  "Trao đổi message qua **FHIR R4** với các resource:",
  "- `Patient`",
  "- `Encounter`",
  "- `Observation`",
].join("\n");

const mdOrderFlow = [
  "# Luồng đặt hàng (Order Flow)",
  "",
  "## Các bước",
  "1. Khách hàng thêm sản phẩm vào giỏ",
  "2. Checkout — nhập địa chỉ giao hàng",
  "3. Thanh toán qua **Payment Gateway**",
  "4. Tạo đơn → gán cho kho (fulfilment)",
  "",
  "> Trạng thái đơn: `pending → paid → shipped → delivered`",
].join("\n");

const mdClassGuide = [
  "# Hướng dẫn Class Diagram",
  "",
  "## Các thành phần",
  "- **Class**: hộp chia 3 phần (tên, thuộc tính, phương thức)",
  "- **Visibility**: `+` public, `-` private, `#` protected",
  "- **Quan hệ**: kế thừa, kết tập, hợp thành, phụ thuộc",
  "",
  "## Mẹo",
  "1. Đặt tên class dạng danh từ số ít",
  "2. Quy ước `camelCase` cho thuộc tính",
  "",
  "```",
  "class Account {",
  "  - balance: Decimal",
  "  + deposit(amount): void",
  "}",
  "```",
].join("\n");

export const ragDocs: RagDoc[] = [
  { id: 1, name: "sdlc-requirements.md", workspace: "banking-sdlc", size: "1,2 KB", status: "ready", content: mdBankingReq },
  { id: 2, name: "pci-dss-checklist.md", workspace: "banking-sdlc", size: "0,9 KB", status: "ready", content: mdPciChecklist },
  { id: 3, name: "patient-workflow.md", workspace: "hospital-hl7", size: "0,7 KB", status: "ready", content: mdPatientFlow },
  { id: 4, name: "order-flow.md", workspace: "ecommerce-patterns", size: "0,5 KB", status: "processing", content: mdOrderFlow },
  { id: 5, name: "class-diagram-guide.md", workspace: "uml-reference", size: "0,8 KB", status: "ready", content: mdClassGuide },
];

/* ----------------------------- Operation · Workspace Templates ----------------------------- */
export type TopicKey = "banking" | "ecommerce" | "social" | "hospital";

export const topicMeta: Record<
  TopicKey,
  { label: string; icon: LucideIcon; dot: string; chip: string }
> = {
  banking: {
    label: "Banking",
    icon: Landmark,
    dot: "#6366f1",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  },
  ecommerce: {
    label: "E-commerce",
    icon: ShoppingBag,
    dot: "#10b981",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  social: {
    label: "Social",
    icon: MessagesSquare,
    dot: "#ec4899",
    chip: "bg-pink-50 text-pink-700 ring-pink-200",
  },
  hospital: {
    label: "Hospital",
    icon: HeartPulse,
    dot: "#0ea5e9",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
  },
};

export type TemplateDoc = {
  id: number;
  name: string;
  type: "PDF" | "DOCX" | "MD" | "CSV";
  size: string;
  status: "ready" | "processing" | "failed";
};

export type WorkspaceTemplate = {
  id: number;
  name: string;
  topic: TopicKey;
  description: string;
  docs: TemplateDoc[];
  access: number;
  clones: number;
  status: "published" | "draft";
  uml: string[];
  updated: string;
};

export const templates: WorkspaceTemplate[] = [
  {
    id: 1,
    name: "Banking System",
    topic: "banking",
    description: "Hệ thống ngân hàng lõi — mở tài khoản, chuyển khoản, sổ cái, tuân thủ PCI-DSS & Basel.",
    docs: [
      { id: 11, name: "sdlc-requirements.pdf", type: "PDF", size: "2,4 MB", status: "ready" },
      { id: 12, name: "core-banking-rfc.docx", type: "DOCX", size: "1,1 MB", status: "ready" },
      { id: 13, name: "pci-dss-checklist.md", type: "MD", size: "210 KB", status: "ready" },
    ],
    access: 4820,
    clones: 312,
    status: "published",
    uml: ["Use Case", "Class", "Sequence", "State", "Activity"],
    updated: "2 giờ trước",
  },
  {
    id: 2,
    name: "E-commerce Platform",
    topic: "ecommerce",
    description: "Đặt hàng, thanh toán, kho và fulfilment theo kiến trúc microservices.",
    docs: [
      { id: 21, name: "order-flow-spec.pdf", type: "PDF", size: "1,8 MB", status: "ready" },
      { id: 22, name: "payment-gateway.docx", type: "DOCX", size: "940 KB", status: "ready" },
      { id: 23, name: "inventory-rules.csv", type: "CSV", size: "520 KB", status: "processing" },
    ],
    access: 3640,
    clones: 254,
    status: "published",
    uml: ["Use Case", "Sequence", "Component", "ERD"],
    updated: "Hôm qua",
  },
  {
    id: 3,
    name: "Social Network",
    topic: "social",
    description: "Feed theo thời gian thực, nhắn tin, theo dõi và hệ thống thông báo.",
    docs: [
      { id: 31, name: "feed-architecture.pdf", type: "PDF", size: "3,1 MB", status: "ready" },
      { id: 32, name: "messaging-protocol.md", type: "MD", size: "180 KB", status: "ready" },
    ],
    access: 2890,
    clones: 198,
    status: "published",
    uml: ["Use Case", "Class", "Sequence", "Activity"],
    updated: "3 ngày trước",
  },
  {
    id: 4,
    name: "Hospital Management",
    topic: "hospital",
    description: "Hồ sơ bệnh án, đặt lịch khám, tương thích HL7/FHIR và quản lý khoa phòng.",
    docs: [
      { id: 41, name: "hl7-fhir-spec.pdf", type: "PDF", size: "5,2 MB", status: "ready" },
      { id: 42, name: "patient-workflow.docx", type: "DOCX", size: "1,3 MB", status: "ready" },
      { id: 43, name: "hipaa-controls.md", type: "MD", size: "260 KB", status: "failed" },
    ],
    access: 2110,
    clones: 168,
    status: "draft",
    uml: ["Use Case", "Class", "Activity", "State"],
    updated: "5 ngày trước",
  },
];

export const cloneTrend = [
  { m: "T1", v: 42 },
  { m: "T2", v: 55 },
  { m: "T3", v: 48 },
  { m: "T4", v: 71 },
  { m: "T5", v: 66 },
  { m: "T6", v: 89 },
  { m: "T7", v: 82 },
  { m: "T8", v: 104 },
  { m: "T9", v: 96 },
  { m: "T10", v: 128 },
  { m: "T11", v: 141 },
  { m: "T12", v: 167 },
];

/* ----------------------------- Operation · Subscription ----------------------------- */
export type PlanStatus = "active" | "draft" | "archived";

export type PlanFeature = {
  key: string;
  label: string;
  included: boolean;
};

export type PlanLimits = {
  projects: number; // -1 = không giới hạn
  diagrams: number;
  aiQueries: number; // -1 = không giới hạn
  collaborators: number;
};

export type SubscriptionPlan = {
  id: number;
  name: string;
  description: string;
  price: number; // giá tháng (0 = miễn phí)
  contactOnly: boolean; // true = giá theo thoả thuận
  status: PlanStatus;
  popular: boolean;
  subscribers: number;
  color: string;
  features: PlanFeature[];
  limits: PlanLimits;
  yearlyBilling: boolean; // hỗ trợ thanh toán theo năm
  yearlyDiscount: number; // % giảm khi thanh toán năm (0-50)
};

/** Toàn bộ tính năng có thể bật/tắt cho mỗi gói */
export const featureCatalog: { key: string; label: string }[] = [
  { key: "unlimited_uml", label: "Sơ đồ UML không giới hạn" },
  { key: "ai_assistant", label: "AI Assistant (RAG)" },
  { key: "export", label: "Xuất PDF / PNG / SVG" },
  { key: "premium_templates", label: "Mẫu workspace cao cấp" },
  { key: "versioning", label: "Phiên bản & lịch sử" },
  { key: "realtime_collab", label: "Cộng tác thời gian thực" },
  { key: "private_ws", label: "Workspace riêng tư" },
  { key: "sso", label: "SSO / SAML" },
  { key: "api_access", label: "Truy cập API" },
  { key: "priority_support", label: "Hỗ trợ ưu tiên" },
];

const mkFeatures = (keys: string[]): PlanFeature[] =>
  featureCatalog.map((f) => ({ ...f, included: keys.includes(f.key) }));

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: "Free",
    description: "Dành cho cá nhân khám phá và phác thảo nhanh.",
    price: 0,
    contactOnly: false,
    status: "active",
    popular: false,
    subscribers: 1842,
    color: "#94a3b8",
    features: mkFeatures(["export"]),
    limits: { projects: 3, diagrams: 25, aiQueries: 10, collaborators: 1 },
    yearlyBilling: false,
    yearlyDiscount: 0,
  },
  {
    id: 2,
    name: "Pro",
    description: "Cho chuyên gia & nhóm nhỏ cần AI và cộng tác.",
    price: 290000,
    contactOnly: false,
    status: "active",
    popular: true,
    subscribers: 746,
    color: "#6366f1",
    features: mkFeatures(["unlimited_uml", "ai_assistant", "export", "premium_templates", "versioning", "realtime_collab"]),
    limits: { projects: 30, diagrams: -1, aiQueries: 1000, collaborators: 5 },
    yearlyBilling: true,
    yearlyDiscount: 20,
  },
  {
    id: 3,
    name: "Business",
    description: "Cho đội ngũ lớn cần bảo mật và quản trị.",
    price: 890000,
    contactOnly: false,
    status: "active",
    popular: false,
    subscribers: 213,
    color: "#0ea5e9",
    features: mkFeatures(["unlimited_uml", "ai_assistant", "export", "premium_templates", "versioning", "realtime_collab", "private_ws", "api_access"]),
    limits: { projects: -1, diagrams: -1, aiQueries: 10000, collaborators: 25 },
    yearlyBilling: true,
    yearlyDiscount: 17,
  },
  {
    id: 4,
    name: "Enterprise",
    description: "Tuỳ biến toàn diện, SSO và hỗ trợ tận nơi.",
    price: 0,
    contactOnly: true,
    status: "draft",
    popular: false,
    subscribers: 18,
    color: "#0f172a",
    features: mkFeatures(featureCatalog.map((f) => f.key)),
    limits: { projects: -1, diagrams: -1, aiQueries: -1, collaborators: -1 },
    yearlyBilling: false,
    yearlyDiscount: 0,
  },
];

export const planUsage: { planId: number; values: number[] }[] = [
  { planId: 1, values: [820, 910, 880, 1050, 990, 1200, 1150, 1380, 1300, 1520, 1650, 1810] },
  { planId: 2, values: [340, 390, 420, 470, 510, 560, 600, 650, 690, 740, 790, 850] },
  { planId: 3, values: [180, 200, 230, 260, 290, 310, 340, 370, 400, 430, 460, 490] },
  { planId: 4, values: [45, 52, 58, 65, 72, 80, 86, 94, 102, 110, 118, 126] },
];

export { Boxes };
