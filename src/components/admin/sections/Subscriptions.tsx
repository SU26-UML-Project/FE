import { useState, useRef } from "react";
import { useClickOutside } from "../../../hooks/useClickOutside";
import { BadgePercent, Calculator, CalendarDays, Check, ChevronDown, CircleDollarSign, Crown, LayoutGrid, List, Palette, Pencil, Plus, Sparkles, Trash2, TrendingUp, Users, X, Zap } from "lucide-react";
import { Badge, Card, Segmented } from "../ui";
import { Modal } from "../Modal";
import { cn } from "../../../utils/cn";

type PlanStatus = "active" | "draft" | "archived";
type PlanFeature = { key: string; label: string; included: boolean };
type PlanLimits = { projects: number; diagrams: number; aiQueries: number; collaborators: number };
type SubscriptionPlan = { id: number; name: string; description: string; price: number; contactOnly: boolean; status: PlanStatus; popular: boolean; subscribers: number; color: string; features: PlanFeature[]; limits: PlanLimits; yearlyBilling: boolean; yearlyDiscount: number; };

const featureCatalog: { key: string; label: string }[] = [
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

const mkFeatures = (keys: string[]): PlanFeature[] => featureCatalog.map((f) => ({ ...f, included: keys.includes(f.key) }));

const seedPlans: SubscriptionPlan[] = [
  { id: 1, name: "Free", description: "Dành cho cá nhân khám phá và phác thảo nhanh.", price: 0, contactOnly: false, status: "active", popular: false, subscribers: 1842, color: "#94a3b8", features: mkFeatures(["export"]), limits: { projects: 3, diagrams: 25, aiQueries: 10, collaborators: 1 }, yearlyBilling: false, yearlyDiscount: 0 },
  { id: 2, name: "Pro", description: "Cho chuyên gia & nhóm nhỏ cần AI và cộng tác.", price: 290000, contactOnly: false, status: "active", popular: true, subscribers: 746, color: "#6366f1", features: mkFeatures(["unlimited_uml", "ai_assistant", "export", "premium_templates", "versioning", "realtime_collab"]), limits: { projects: 30, diagrams: -1, aiQueries: 1000, collaborators: 5 }, yearlyBilling: true, yearlyDiscount: 20 },
  { id: 3, name: "Business", description: "Cho đội ngũ lớn cần bảo mật và quản trị.", price: 890000, contactOnly: false, status: "active", popular: false, subscribers: 213, color: "#0ea5e9", features: mkFeatures(["unlimited_uml", "ai_assistant", "export", "premium_templates", "versioning", "realtime_collab", "private_ws", "api_access"]), limits: { projects: -1, diagrams: -1, aiQueries: 10000, collaborators: 25 }, yearlyBilling: true, yearlyDiscount: 17 },
  { id: 4, name: "Enterprise", description: "Tuỳ biến toàn diện, SSO và hỗ trợ tận nơi.", price: 0, contactOnly: true, status: "draft", popular: false, subscribers: 18, color: "#0f172a", features: mkFeatures(featureCatalog.map((f) => f.key)), limits: { projects: -1, diagrams: -1, aiQueries: -1, collaborators: -1 }, yearlyBilling: false, yearlyDiscount: 0 },
];

const statusLabel: Record<PlanStatus, { tone: "emerald" | "amber" | "slate"; label: string }> = {
  active: { tone: "emerald", label: "Đang hoạt động" },
  draft: { tone: "amber", label: "Bản nháp" },
  archived: { tone: "slate", label: "Đã lưu trữ" },
};

const accentColors = ["#e4a11b", "#0ea5e9", "#10b981", "#6366f1", "#ec4899", "#0f172a", "#8b5cf6", "#14b8a6"];

type Draft = { id: number; mode: "create" | "edit"; name: string; description: string; price: number; contactOnly: boolean; yearlyBilling: boolean; yearlyDiscount: number; status: PlanStatus; popular: boolean; subscribers: number; color: string; features: Record<string, boolean>; customFeatures: string[]; limits: PlanLimits; };
type Billing = "monthly" | "yearly";

const unlimited = (v: number) => v < 0;
const isCatalogKey = (k: string) => featureCatalog.some((f) => f.key === k);
const fmtVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export const discountLevels = [5, 10, 15, 17, 20, 25, 30];

type PriceInfo = { amount: string; suffix: string; perMonth?: string; saved?: string; isZero: boolean; yearlySupported: boolean; };

export function yearlyCalc(price: number, discountPct: number) {
  const disc = discountPct / 100;
  const annualFull = price * 12;
  const annual = Math.round(annualFull * (1 - disc));
  const perMonth = Math.round(annual / 12);
  const saved = annualFull - annual;
  return { annual, perMonth, saved, annualFull, freeMonths: price > 0 ? saved / price : 0, disc };
}

function computePrice(plan: SubscriptionPlan, billing: Billing): PriceInfo {
  if (plan.contactOnly) return { amount: "Liên hệ", suffix: "theo thoả thuận", isZero: true, yearlySupported: false };
  if (plan.price === 0) return { amount: "Miễn phí", suffix: "vĩnh viễn", isZero: true, yearlySupported: false };
  if (billing === "monthly" || !plan.yearlyBilling) return { amount: `${fmtVnd(plan.price)}đ`, suffix: "/tháng", isZero: false, yearlySupported: plan.yearlyBilling };
  const c = yearlyCalc(plan.price, plan.yearlyDiscount);
  return { amount: `${fmtVnd(c.annual)}đ`, suffix: "/năm", perMonth: `${fmtVnd(c.perMonth)}đ/tháng`, saved: `${fmtVnd(c.saved)}đ`, isZero: false, yearlySupported: true };
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-slate-900" : "bg-slate-200")}>
    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
  </button>;
}

function FormulaCard({ price, discount }: { price: number; discount: number }) {
  const c = yearlyCalc(price, discount);
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
    <div className="mb-2 flex items-center gap-1.5"><Calculator className="h-3.5 w-3.5 text-indigo-600" /><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Công thức tính</span></div>
    <p className="mb-2.5 rounded-lg bg-white px-2.5 py-1.5 text-center font-mono text-[12px] text-slate-600 ring-1 ring-inset ring-slate-200">Giá năm = Giá tháng × 12 × (1 − <span className="text-indigo-600">{discount}%</span>)</p>
    <div className="space-y-1 font-mono text-[11.5px] text-slate-500">
      <div className="flex items-center justify-between gap-2"><span>= {fmtVnd(price)} × 12 × {(1 - c.disc).toFixed(2)}</span><span className="text-slate-400">→ bước 1</span></div>
      <div className="flex items-center justify-between gap-2"><span>= {fmtVnd(c.annualFull)} × {(1 - c.disc).toFixed(2)}</span><span className="text-slate-400">→ bước 2</span></div>
    </div>
    <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-200 pt-2.5">
      <div className="rounded-lg bg-indigo-50 p-2 text-center"><p className="text-[13.5px] font-bold text-indigo-700">{fmtVnd(c.annual)}đ</p><p className="text-[10px] text-indigo-500">Giá 1 năm</p></div>
      <div className="rounded-lg bg-slate-100 p-2 text-center"><p className="text-[13.5px] font-bold text-slate-900">{fmtVnd(c.perMonth)}đ</p><p className="text-[10px] text-slate-400">Quy đổi/tháng</p></div>
      <div className="rounded-lg bg-emerald-50 p-2 text-center"><p className="text-[13.5px] font-bold text-emerald-700">{fmtVnd(c.saved)}đ</p><p className="text-[10px] text-emerald-600">Tiết kiệm</p></div>
    </div>
    <p className="mt-2 text-center text-[11px] text-emerald-600">≈ tiết kiệm {c.freeMonths.toFixed(1)} tháng phí · giảm {discount}% so với trả theo tháng</p>
  </div>;
}

function StatCard({ icon: Icon, label, value, delta }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta?: string }) {
  return <Card className="p-4">
    <div className="flex items-center justify-between">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-[18px] w-[18px]" /></span>
      {delta && <Badge tone="emerald"><TrendingUp className="h-3 w-3" /> {delta}</Badge>}
    </div>
    <p className="mt-3 text-[22px] font-semibold tracking-tight text-slate-900">{value}</p>
    <p className="text-[12.5px] text-slate-500">{label}</p>
  </Card>;
}

function PlanCard({ plan, billing, onEdit, onDelete, onStatusChange }: { plan: SubscriptionPlan; billing: Billing; onEdit: () => void; onDelete: () => void; onStatusChange: (s: PlanStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const price = computePrice(plan, billing);
  const included = plan.features.filter((f) => f.included);
  const excluded = plan.features.filter((f) => !f.included);
  const limit = (label: string, v: number | string) => <div className="rounded-xl bg-slate-50 p-2 text-center ring-1 ring-inset ring-slate-200">
    <p className="text-[13px] font-bold text-slate-900">{typeof v === "number" ? (v < 0 ? "∞" : fmtVnd(v)) : v}</p>
    <p className="text-[10.5px] text-slate-400">{label}</p>
  </div>;

  return <Card className="flex flex-col overflow-visible hover:border-indigo-200">
    <div className="h-1.5 w-full" style={{ backgroundColor: plan.color }} />
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: plan.color }}>
            {plan.popular ? <Crown className="h-[18px] w-[18px]" /> : <CircleDollarSign className="h-[18px] w-[18px]" />}
          </span>
          <div><h3 className="text-[15px] font-semibold text-slate-900">{plan.name}</h3><span className="text-[11px] text-slate-400">{fmtVnd(plan.subscribers)} thuê bao</span></div>
        </div>
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition", open && "ring-2 ring-slate-400 ring-offset-1")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", plan.status === "active" ? "bg-emerald-500" : plan.status === "draft" ? "bg-amber-500" : "bg-slate-400")} />
            {statusLabel[plan.status].label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              {(Object.keys(statusLabel) as PlanStatus[]).map((s) => (
                <button key={s} onClick={() => { onStatusChange(s); setOpen(false); }} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition", s === plan.status ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50")}>
                  <span className={cn("h-2 w-2 rounded-full", s === "active" ? "bg-emerald-500" : s === "draft" ? "bg-amber-500" : "bg-slate-400")} />
                  {statusLabel[s].label}
                  {s === plan.status && <Check className="ml-auto h-3.5 w-3.5 text-slate-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {plan.popular && <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"><Sparkles className="h-3 w-3" /> Phổ biến nhất</span>}
      <div className="mt-3">
        <div className="flex items-baseline gap-1"><span className="text-[26px] font-bold tracking-tight text-slate-900">{price.amount}</span><span className="text-[12px] text-slate-400">{price.suffix}</span></div>
        {price.perMonth && <p className="mt-0.5 text-[11.5px] text-slate-400">≈ {price.perMonth} · <span className="font-medium text-emerald-600">tiết kiệm {price.saved}/năm</span></p>}
        {billing === "yearly" && !price.yearlySupported && !price.isZero && <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200"><CalendarDays className="h-3 w-3" /> Chỉ thanh toán theo tháng</p>}
        {plan.yearlyBilling && billing === "monthly" && !price.isZero && <p className="mt-1 text-[11px] text-slate-400">Có hỗ trợ thanh toán năm · giảm {plan.yearlyDiscount}%</p>}
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{plan.description}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {limit("Dự án", plan.limits.projects)}
        {limit("Sơ đồ", plan.limits.diagrams)}
        {limit("AI query", plan.limits.aiQueries)}
        {limit("Cộng tác viên", plan.limits.collaborators)}
      </div>
      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
        {included.map((f) => <div key={f.key} className="flex items-center gap-2 text-[12.5px] text-slate-700"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="truncate">{f.label}</span></div>)}
        {excluded.slice(0, 2).map((f) => <div key={f.key} className="flex items-center gap-2 text-[12.5px] text-slate-300"><X className="h-3.5 w-3.5 shrink-0" /><span className="truncate line-through">{f.label}</span></div>)}
        {excluded.length > 2 && <p className="pl-5 text-[11.5px] text-slate-400">+ {excluded.length - 2} tính năng khác bị tắt</p>}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"><Pencil className="h-4 w-4" /> Chỉnh sửa</button>
        <button onClick={onDelete} className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  </Card>;
}

function PlanRow({ plan, billing, onEdit, onDelete, onStatusChange }: { plan: SubscriptionPlan; billing: Billing; onEdit: () => void; onDelete: () => void; onStatusChange: (s: PlanStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const price = computePrice(plan, billing);
  const includedCount = plan.features.filter((f) => f.included).length;
  const totalFeatures = plan.features.length;
  const lim = (v: number) => (v < 0 ? "∞" : fmtVnd(v));
  return <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: plan.color }}>
      {plan.popular ? <Crown className="h-[18px] w-[18px]" /> : <CircleDollarSign className="h-[18px] w-[18px]" />}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-[13.5px] font-semibold text-slate-900">{plan.name}</p>
        {plan.popular && <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"><Sparkles className="h-2.5 w-2.5" /> Phổ biến</span>}
      </div>
      <p className="truncate text-[12px] text-slate-400">{plan.description}</p>
    </div>
    <div className="hidden w-28 shrink-0 text-right sm:block">
      <p className="text-[13px] font-bold text-slate-900">{price.amount}</p>
      <p className="text-[11px] text-slate-400">{price.suffix}</p>
      {billing === "yearly" && !price.yearlySupported && !price.isZero && <p className="text-[10px] text-slate-400">Chỉ tháng</p>}
    </div>
    <div className="hidden shrink-0 items-center gap-3 text-center lg:flex">
      {[{ l: "Dự án", v: lim(plan.limits.projects) }, { l: "Sơ đồ", v: lim(plan.limits.diagrams) }, { l: "AI", v: lim(plan.limits.aiQueries) }].map((x) => (
        <div key={x.l} className="w-12"><p className="text-[13px] font-bold text-slate-900">{x.v}</p><p className="text-[10px] text-slate-400">{x.l}</p></div>
      ))}
    </div>
    <div className="hidden w-20 shrink-0 text-center md:block"><p className="text-[13px] font-bold text-slate-900">{includedCount}/{totalFeatures}</p><p className="text-[10px] text-slate-400">tính năng</p></div>
    <div className="hidden w-20 shrink-0 text-right xl:block"><p className="text-[13px] font-bold text-slate-900">{fmtVnd(plan.subscribers)}</p><p className="text-[10px] text-slate-400">thuê bao</p></div>
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition", open && "ring-2 ring-slate-400 ring-offset-1")}>
        <span className={cn("h-1.5 w-1.5 rounded-full", plan.status === "active" ? "bg-emerald-500" : plan.status === "draft" ? "bg-amber-500" : "bg-slate-400")} />
        {statusLabel[plan.status].label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {(Object.keys(statusLabel) as PlanStatus[]).map((s) => (
            <button key={s} onClick={() => { onStatusChange(s); setOpen(false); }} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition", s === plan.status ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50")}>
              <span className={cn("h-2 w-2 rounded-full", s === "active" ? "bg-emerald-500" : s === "draft" ? "bg-amber-500" : "bg-slate-400")} />
              {statusLabel[s].label}
              {s === plan.status && <Check className="ml-auto h-3.5 w-3.5 text-slate-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
    <div className="flex shrink-0 items-center gap-0.5">
      <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
      <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
    </div>
  </div>;
}

function LimitField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const unlim = unlimited(value);
  return <div>
    <div className="mb-1 flex items-center justify-between">
      <span className="text-[12.5px] font-medium text-slate-700">{label}</span>
      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-400"><Switch on={unlim} onClick={() => onChange(unlim ? 0 : -1)} /> Không giới hạn</label>
    </div>
    <input type="text" inputMode="numeric" disabled={unlim} value={unlim ? "" : value} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); onChange(v ? Math.max(0, parseInt(v, 10)) : 0); }} placeholder={unlim ? "∞" : "0"}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:text-slate-400" />
  </div>;
}

function PlanEditor({ draft, setDraft, onSave, onClose, tab, onTabChange }: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onClose: () => void; tab: "info" | "config" | "features" | "review"; onTabChange: (t: "info" | "config" | "features" | "review") => void }) {
  const [newFeature, setNewFeature] = useState("");
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setLimit = (patch: Partial<PlanLimits>) => set({ limits: { ...draft.limits, ...patch } });
  const addCustomFeature = () => {
    const label = newFeature.trim();
    if (!label || draft.customFeatures.includes(label)) return;
    set({ customFeatures: [...draft.customFeatures, label], features: { ...draft.features, [`custom_${label}`]: true } });
    setNewFeature("");
  };
  const removeCustomFeature = (label: string) => {
    const key = `custom_${label}`;
    const { [key]: _omit, ...rest } = draft.features;
    set({ customFeatures: draft.customFeatures.filter((f) => f !== label), features: rest });
  };
  const inputCls = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100";

  const steps = ["info", "config", "features", "review"] as const;
  const stepIdx = steps.indexOf(tab);
  const nextStep = () => { if (stepIdx < 3) onTabChange(steps[stepIdx + 1]); };
  const prevStep = () => { if (stepIdx > 0) onTabChange(steps[stepIdx - 1]); };

  return <div>

    {tab === "info" && <div className="space-y-4">
      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Thông tin chung</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-700">Tên gói</span><input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="VD: Pro" className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-700">Trạng thái</span>
            <div className="relative">
              <select value={draft.status} onChange={(e) => set({ status: e.target.value as PlanStatus })} className={cn(inputCls, "appearance-none pr-9")}>
                <option value="active">Đang hoạt động</option><option value="draft">Bản nháp</option><option value="archived">Đã lưu trữ</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>
        <label className="mt-2.5 block"><span className="mb-1 block text-[12.5px] font-medium text-slate-700">Mô tả</span><textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Mô tả ngắn về gói…" className={cn(inputCls, "resize-none")} /></label>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Hiển thị</p>
        <label className="mb-3 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-slate-700"><Crown className="h-4 w-4 text-amber-500" /> Đánh dấu là gói phổ biến</span>
          <Switch on={draft.popular} onClick={() => set({ popular: !draft.popular })} />
        </label>
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Màu nhận diện</p>
          <div className="flex flex-wrap items-center gap-2">
            {accentColors.map((c) => <button key={c} onClick={() => set({ color: c })} className={cn("h-7 w-7 rounded-full transition", draft.color === c ? "ring-2 ring-slate-900 ring-offset-2" : "ring-1 ring-slate-200")} style={{ backgroundColor: c }} />)}
            <div className="relative ml-1 flex items-center gap-2">
              <label className={cn("flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 transition", accentColors.includes(draft.color) ? "ring-slate-200" : "ring-2 ring-slate-900 ring-offset-2")} style={{ backgroundColor: accentColors.includes(draft.color) ? "#fff" : draft.color }} title="Chọn màu tự do">
                <Palette className={cn("h-3.5 w-3.5", accentColors.includes(draft.color) ? "text-slate-500" : "text-white")} />
                <input type="color" value={accentColors.includes(draft.color) ? "#e4a11b" : draft.color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <input value={draft.color} onChange={(e) => set({ color: e.target.value })} className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-[11px] uppercase text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
            </div>
          </div>
        </div>
      </div>
    </div>}

    {tab === "config" && <div className="space-y-4">
      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Giá & chu kỳ thanh toán</p>

        <label className="mb-2.5 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-slate-700"><CircleDollarSign className="h-4 w-4 text-slate-400" /> Giá theo thoả thuận (báo giá riêng)</span>
          <Switch on={draft.contactOnly} onClick={() => set({ contactOnly: !draft.contactOnly })} />
        </label>

        {!draft.contactOnly && <label className="block mb-2.5"><span className="mb-1 flex items-center gap-2 text-[12.5px] font-medium text-slate-700"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Giá hàng tháng (VNĐ) <span className="font-normal text-slate-400">— đặt 0 cho gói miễn phí</span></span><input type="text" inputMode="numeric" value={draft.price || ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); set({ price: v ? Math.max(0, parseInt(v, 10)) : 0 }); }} placeholder="0" className={inputCls} /></label>}

        {!draft.contactOnly && draft.price > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <button type="button" onClick={() => set({ yearlyBilling: !draft.yearlyBilling })} className={cn("flex w-full items-center justify-between gap-3 p-3 text-left transition", draft.yearlyBilling ? "bg-indigo-50/50" : "bg-white hover:bg-slate-50")}>
              <span className="flex items-center gap-2.5">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition", draft.yearlyBilling ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500")}>
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-slate-900">Hỗ trợ thanh toán theo năm</span>
                  <span className="block text-[11.5px] text-slate-400">{draft.yearlyBilling ? "Đang bật — khách hàng có thể trả 1 lần cả năm để được giảm giá." : "Mặc định chỉ thanh toán theo tháng."}</span>
                </span>
              </span>
              <Switch on={draft.yearlyBilling} onClick={() => set({ yearlyBilling: !draft.yearlyBilling })} />
            </button>

            {draft.yearlyBilling && (
              <div className="animate-fade-in space-y-3 border-t border-slate-100 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block"><span className="mb-1 flex items-center gap-2 text-[12.5px] font-medium text-slate-700"><BadgePercent className="h-3.5 w-3.5 text-emerald-600" /> Mức giảm giá năm</span>
                    <div className="relative">
                      <select value={discountLevels.includes(draft.yearlyDiscount) ? draft.yearlyDiscount : "custom"} onChange={(e) => { const v = parseInt(e.target.value); set({ yearlyDiscount: isNaN(v) ? draft.yearlyDiscount : v }); }} className={cn(inputCls, "appearance-none pr-9")}>
                        {discountLevels.map((d) => <option key={d} value={d}>Giảm {d}%</option>)}
                        <option value="custom">Tự nhập %…</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </label>
                  {!discountLevels.includes(draft.yearlyDiscount) && (
                    <label className="block"><span className="mb-1 block text-[12.5px] font-medium text-slate-700">% giảm (0 – 50)</span>
                      <input type="text" inputMode="numeric" value={draft.yearlyDiscount || ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); set({ yearlyDiscount: Math.min(50, Math.max(0, parseInt(v, 10) || 0)) }); }} placeholder="20" className={inputCls} />
                    </label>
                  )}
                </div>
                <FormulaCard price={draft.price} discount={draft.yearlyDiscount} />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Giới hạn sử dụng</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <LimitField label="Số dự án" value={draft.limits.projects} onChange={(v) => setLimit({ projects: v })} />
          <LimitField label="Số sơ đồ UML" value={draft.limits.diagrams} onChange={(v) => setLimit({ diagrams: v })} />
          <LimitField label="Lượt AI query" value={draft.limits.aiQueries} onChange={(v) => setLimit({ aiQueries: v })} />
          <LimitField label="Cộng tác viên" value={draft.limits.collaborators} onChange={(v) => setLimit({ collaborators: v })} />
        </div>
      </div>
    </div>}

    {tab === "features" && <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Tính năng đi kèm</p>
        <span className="text-[11px] text-slate-400">{Object.values(draft.features).filter(Boolean).length}/{featureCatalog.length + draft.customFeatures.length} bật</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {featureCatalog.map((f) => {
          const on = draft.features[f.key];
          return <button key={f.key} onClick={() => set({ features: { ...draft.features, [f.key]: !on } })} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition", on ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50")}>
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border transition", on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white")}>{on && <Check className="h-3 w-3" />}</span>
            <span className={cn("text-[12.5px]", on ? "text-slate-800" : "text-slate-500")}>{f.label}</span>
          </button>;
        })}
        {draft.customFeatures.map((label) => {
          const key = `custom_${label}`;
          const on = draft.features[key];
          return <div key={key} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition", on ? "border-slate-900 bg-slate-50" : "border-slate-200")}>
            <button onClick={() => set({ features: { ...draft.features, [key]: !on } })} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition", on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white")}>{on && <Check className="h-3 w-3" />}</button>
            <span className="flex-1 truncate text-[12.5px] text-slate-700">{label}</span>
            <button onClick={() => removeCustomFeature(label)} className="shrink-0 rounded p-0.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
          </div>;
        })}
      </div>
      <div className="flex items-center gap-2">
        <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomFeature()} placeholder="Thêm tính năng riêng…" className={cn(inputCls, "border-dashed")} />
        <button onClick={addCustomFeature} disabled={!newFeature.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 disabled:opacity-40">
          <Plus className="h-4 w-4" /> Thêm
        </button>
      </div>
    </div>}

    {tab === "review" && <div className="space-y-4">
      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Xem lại thông tin</p>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Tên gói</span><span className="text-[13px] font-medium text-slate-900">{draft.name || "(chưa đặt tên)"}</span></div>
          <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Trạng thái</span><Badge tone={statusLabel[draft.status].tone}>{statusLabel[draft.status].label}</Badge></div>
          <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Phổ biến</span><span className="text-[13px] text-slate-900">{draft.popular ? "✅ Có" : "—"}</span></div>
          <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Màu</span><span className="flex items-center gap-2 text-[13px] text-slate-900"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: draft.color }} /> {draft.color}</span></div>
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Giá & chu kỳ</p>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {draft.contactOnly ? (
            <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Giá</span><span className="text-[13px] font-medium text-slate-900">Liên hệ báo giá riêng</span></div>
          ) : (
            <>
              <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Giá tháng</span><span className="text-[13px] font-medium text-slate-900">{draft.price === 0 ? "Miễn phí" : `${fmtVnd(draft.price)}đ`}</span></div>
              <div className="flex items-center justify-between"><span className="text-[12.5px] text-slate-500">Thanh toán năm</span><span className="text-[13px] font-medium text-slate-900">{draft.yearlyBilling ? `✅ Bật — Giảm ${draft.yearlyDiscount}%` : "Tắt"}</span></div>
              {draft.yearlyBilling && draft.price > 0 && (
                <div className="mt-2"><FormulaCard price={draft.price} discount={draft.yearlyDiscount} /></div>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Giới hạn</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ label: "Dự án", v: draft.limits.projects }, { label: "Sơ đồ UML", v: draft.limits.diagrams }, { label: "AI query", v: draft.limits.aiQueries }, { label: "Cộng tác viên", v: draft.limits.collaborators }].map((x) => (
            <div key={x.label} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
              <p className="text-[13px] font-bold text-slate-900">{unlimited(x.v) ? "∞" : fmtVnd(x.v)}</p>
              <p className="text-[10.5px] text-slate-400">{x.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Tính năng ({Object.values(draft.features).filter(Boolean).length}/{featureCatalog.length + draft.customFeatures.length} bật)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {featureCatalog.map((f) => {
            const on = draft.features[f.key];
            return <div key={f.key} className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px]", on ? "text-slate-700" : "text-slate-300")}>
              <span className={cn(on ? "text-emerald-600" : "text-slate-200")}>{on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</span>
              {f.label}
            </div>;
          })}
        </div>
      </div>
    </div>}

    {/* Bottom navigation */}
    <div className="-mx-5 -mb-4 mt-4 flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={cn("h-2 w-2 rounded-full transition", i <= stepIdx ? "bg-slate-900" : "bg-slate-200")} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">Huỷ</button>
        {stepIdx > 0 && (
          <button onClick={prevStep} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">Quay lại</button>
        )}
        {tab === "review" ? (
          <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
            <Check className="h-4 w-4" /> {draft.mode === "edit" ? "Lưu thay đổi" : "Tạo gói"}
          </button>
        ) : (
          <button onClick={nextStep} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
            Tiếp theo <ChevronDown className="-rotate-90 h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  </div>;
}

function toDraft(plan: SubscriptionPlan): Draft {
  const features: Record<string, boolean> = {};
  featureCatalog.forEach((f) => (features[f.key] = plan.features.some((p) => p.key === f.key && p.included)));
  const customFeatures: string[] = [];
  plan.features.filter((p) => !isCatalogKey(p.key)).forEach((p) => { customFeatures.push(p.label); features[p.key] = p.included; });
  return { id: plan.id, mode: "edit", name: plan.name, description: plan.description, price: plan.price, contactOnly: plan.contactOnly, yearlyBilling: plan.yearlyBilling, yearlyDiscount: plan.yearlyDiscount, status: plan.status, popular: plan.popular, subscribers: plan.subscribers, color: plan.color, features, customFeatures, limits: { ...plan.limits } };
}

function blankDraft(): Draft {
  const features: Record<string, boolean> = {};
  featureCatalog.forEach((f) => (features[f.key] = false));
  return { id: 0, mode: "create", name: "", description: "", price: 0, contactOnly: false, yearlyBilling: false, yearlyDiscount: 20, status: "draft", popular: false, subscribers: 0, color: accentColors[0], features, customFeatures: [], limits: { projects: 5, diagrams: 50, aiQueries: 100, collaborators: 1 } };
}

function draftToPlan(d: Draft, base?: SubscriptionPlan): SubscriptionPlan {
  const features: PlanFeature[] = featureCatalog.map((f) => ({ key: f.key, label: f.label, included: !!d.features[f.key] }));
  d.customFeatures.forEach((label) => { features.push({ key: `custom_${label}`, label, included: !!d.features[`custom_${label}`] }); });
  return { id: base?.id ?? d.id, name: d.name.trim() || "Gói chưa đặt tên", description: d.description.trim() || "—", price: d.contactOnly ? 0 : d.price, contactOnly: d.contactOnly, yearlyBilling: d.yearlyBilling && !d.contactOnly, yearlyDiscount: d.yearlyDiscount, status: d.status, popular: d.popular, subscribers: d.subscribers, color: d.color, features, limits: d.limits };
}

export default function SubscriptionsSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(seedPlans);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<SubscriptionPlan | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [billing, setBilling] = useState<Billing>("monthly");
  const [editorTab, setEditorTab] = useState<"info" | "config" | "features" | "review">("info");

  const activePlans = plans.filter((p) => p.status === "active").length;
  const totalSubs = plans.reduce((s, p) => s + p.subscribers, 0);
  const yearlyCount = plans.filter((p) => p.yearlyBilling).length;
  const mrr = plans.filter((p) => p.status === "active").reduce((s, p) => s + p.price * p.subscribers, 0);

  function save() {
    if (!draft) return;
    if (draft.mode === "edit") {
      const base = plans.find((p) => p.id === draft.id);
      setPlans((arr) => arr.map((p) => (p.id === (base?.id ?? 0) ? draftToPlan(draft, base) : p)));
    } else {
      setPlans((arr) => [...arr, draftToPlan({ ...draft, id: Date.now() })]);
    }
    setDraft(null);
  }
  function doDelete() {
    if (!confirmDel) return;
    setPlans((arr) => arr.filter((p) => p.id !== confirmDel.id));
    setConfirmDel(null);
  }
  function changeStatus(planId: number, status: PlanStatus) {
    setPlans((arr) => arr.map((p) => p.id === planId ? { ...p, status } : p));
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-900">Gói Subscription</h3>
        <p className="text-[13px] text-slate-500">Tạo gói và cấu hình tính năng, giá & chu kỳ thanh toán</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CircleDollarSign} label="Tổng số gói" value={String(plans.length)} />
        <StatCard icon={Zap} label="Gói đang hoạt động" value={String(activePlans)} />
        <StatCard icon={Users} label="Tổng thuê bao" value={fmtVnd(totalSubs)} delta="+5,2%" />
        <StatCard icon={TrendingUp} label="MRR ước tính" value={`${fmtVnd(mrr)}đ`} delta="+9,1%" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-[14px] font-semibold text-slate-900">Các gói subscription</h3><p className="text-[13px] text-slate-500">Tạo gói và bật/tắt từng tính năng đi kèm.</p></div>
          <div className="flex items-center gap-2">
            <Segmented value={view} onChange={setView} options={[{ id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> }, { id: "list", label: "", icon: <List className="h-4 w-4" /> }]} />
            <button onClick={() => setDraft(blankDraft())} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
              <Plus className="h-4 w-4" /> Tạo gói
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 sm:flex-row sm:gap-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(["monthly", "yearly"] as const).map((b) => {
              const disabled = b === "yearly" && yearlyCount === 0;
              return <button key={b} onClick={() => !disabled && setBilling(b)} disabled={disabled} title={disabled ? "Chưa có gói nào bật thanh toán năm" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[13px] font-medium transition", billing === b ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900", disabled && "cursor-not-allowed opacity-40")}>
                {b === "monthly" ? "Hàng tháng" : "Hàng năm"}
                {b === "yearly" && <span className={cn("rounded px-1 text-[10px]", billing === b ? "bg-white/20" : "bg-white text-slate-500")}>{yearlyCount}</span>}
              </button>;
            })}
          </div>
          {billing === "yearly" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700"><BadgePercent className="h-3.5 w-3.5" /> {yearlyCount} gói hỗ trợ giảm giá theo năm</span>
          ) : (
            <span className="text-[12px] text-slate-400">{yearlyCount > 0 ? `${yearlyCount} gói đang bật thanh toán năm — chuyển sang xem giá ưu đãi` : "Bật thanh toán năm trong từng gói để hiển thị giá ưu đãi"}</span>
          )}
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <svg viewBox="0 0 120 120" className="h-28 w-28 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="10" y="20" width="100" height="80" rx="8" strokeDasharray="4 3" />
              <path d="M10 40h100" />
              <path d="M30 20V10h60v10" />
              <circle cx="60" cy="60" r="6" />
              <path d="M46 72c0-8 6.2-14 14-14s14 6 14 14" />
              <path d="M52 56a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              <path d="M68 56a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            <p className="text-[15px] font-medium text-slate-400">Chưa có gói subscription nào</p>
            <p className="text-[13px] text-slate-400">Tạo gói đầu tiên để bắt đầu cung cấp subscription cho người dùng.</p>
            <button onClick={() => setDraft(blankDraft())} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700">
              <Plus className="h-4 w-4" /> Tạo gói đầu tiên
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {plans.map((p) => <PlanCard key={p.id} billing={billing} plan={p} onEdit={() => setDraft(toDraft(p))} onDelete={() => setConfirmDel(p)} onStatusChange={(s) => changeStatus(p.id, s)} />)}
            <button onClick={() => setDraft(blankDraft())} className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"><Plus className="h-7 w-7" /><span className="text-[13px] font-medium">Tạo gói mới</span></button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 md:flex">
              <span className="w-9 shrink-0" /><span className="flex-1">Gói</span><span className="hidden w-28 shrink-0 text-right sm:block">Giá</span>
              <span className="hidden w-[150px] shrink-0 lg:block">Giới hạn</span><span className="hidden w-20 shrink-0 text-center md:block">Tính năng</span>
              <span className="hidden w-20 shrink-0 text-right xl:block">Thuê bao</span><span className="w-[68px] shrink-0">Trạng thái</span><span className="w-[72px] shrink-0 text-right">Thao tác</span>
            </div>
            {plans.map((p) => <PlanRow key={p.id} billing={billing} plan={p} onEdit={() => setDraft(toDraft(p))} onDelete={() => setConfirmDel(p)} onStatusChange={(s) => changeStatus(p.id, s)} />)}
            <button onClick={() => setDraft(blankDraft())} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-[13px] font-medium text-slate-400 transition hover:border-indigo-300 hover:text-indigo-500"><Plus className="h-5 w-5" /> Tạo gói mới</button>
          </div>
        )}
      </Card>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.mode === "edit" ? "Chỉnh sửa gói" : "Tạo gói subscription"} desc={draft?.mode === "edit" ? draft?.name : "Cấu hình giá, giới hạn và tính năng cho gói"} size="xl"
        headerExtra={<div className="flex items-center gap-1">
          {(["info", "config", "features", "review"] as const).map((t) => (
            <button key={t} onClick={() => setEditorTab(t)} className={cn("rounded-lg px-3 py-1.5 text-[13px] font-medium transition", editorTab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900")}>
              {t === "info" ? "Thông tin" : t === "config" ? "Cấu hình gói" : t === "features" ? "Tính năng" : "Xem lại"}
            </button>
          ))}
        </div>}>
        {draft && <PlanEditor draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} tab={editorTab} onTabChange={setEditorTab} />}
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Xoá gói subscription?" size="sm"
        footer={<><button onClick={() => setConfirmDel(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">Huỷ</button><button onClick={doDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-rose-700"><Trash2 className="h-4 w-4" /> Xoá gói</button></>}>
        <p className="text-[13px] leading-relaxed text-slate-600">Gói <b className="text-slate-900">{confirmDel?.name}</b> đang có <b className="text-slate-900">{fmtVnd(confirmDel?.subscribers ?? 0)}</b> thuê bao sẽ bị xoá. Người dùng đang sử dụng gói này sẽ cần được chuyển sang gói khác. Hành động không thể hoàn tác.</p>
      </Modal>
      </div>
    </div>
  );
}

