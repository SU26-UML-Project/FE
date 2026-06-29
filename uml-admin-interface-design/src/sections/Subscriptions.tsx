import { useState } from "react";
import {
  BadgePercent,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Crown,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
  Palette,
} from "lucide-react";
import {
  featureCatalog,
  subscriptionPlans,
  type PlanFeature,
  type PlanLimits,
  type PlanStatus,
  type SubscriptionPlan,
} from "@/data/mock";
import { Badge, Button, Card, inputCls, PageHeader, Segmented } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { cn } from "@/utils/cn";

const statusMap: Record<PlanStatus, { tone: "emerald" | "amber" | "slate"; label: string }> = {
  active: { tone: "emerald", label: "Đang hoạt động" },
  draft: { tone: "amber", label: "Bản nháp" },
  archived: { tone: "slate", label: "Đã lưu trữ" },
};

const accentColors = ["#e4a11b", "#0ea5e9", "#10b981", "#6366f1", "#ec4899", "#0f172a", "#8b5cf6", "#14b8a6"];

type Draft = {
  id: number;
  mode: "create" | "edit";
  name: string;
  description: string;
  price: number;
  contactOnly: boolean;
  yearlyBilling: boolean;
  yearlyDiscount: number;
  status: PlanStatus;
  popular: boolean;
  subscribers: number;
  color: string;
  features: Record<string, boolean>;
  customFeatures: string[];
  limits: PlanLimits;
};

const unlimited = (v: number) => v < 0;
const isCatalogKey = (k: string) => featureCatalog.some((f) => f.key === k);

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-ink" : "bg-black/10")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n);
}

type Billing = "monthly" | "yearly";

export const discountLevels = [5, 10, 15, 17, 20, 25, 30];

type PriceInfo = {
  amount: string;
  suffix: string;
  perMonth?: string;
  saved?: string;
  isZero: boolean;
  yearlySupported: boolean;
};

export function yearlyCalc(price: number, discountPct: number) {
  const disc = discountPct / 100;
  const annualFull = price * 12;
  const annual = Math.round(annualFull * (1 - disc));
  const perMonth = Math.round(annual / 12);
  const saved = annualFull - annual;
  const freeMonths = price > 0 ? saved / price : 0;
  return { annual, perMonth, saved, annualFull, freeMonths, disc };
}

function computePrice(plan: SubscriptionPlan, billing: Billing): PriceInfo {
  if (plan.contactOnly) {
    return { amount: "Liên hệ", suffix: "theo thoả thuận", isZero: true, yearlySupported: false };
  }
  if (plan.price === 0) {
    return { amount: "Miễn phí", suffix: "vĩnh viễn", isZero: true, yearlySupported: false };
  }
  if (billing === "monthly" || !plan.yearlyBilling) {
    return { amount: `${fmtVnd(plan.price)}đ`, suffix: "/tháng", isZero: false, yearlySupported: plan.yearlyBilling };
  }
  const c = yearlyCalc(plan.price, plan.yearlyDiscount);
  return {
    amount: `${fmtVnd(c.annual)}đ`,
    suffix: "/năm",
    perMonth: `${fmtVnd(c.perMonth)}đ/tháng`,
    saved: `${fmtVnd(c.saved)}đ`,
    isZero: false,
    yearlySupported: true,
  };
}

/** Ô công thức minh bạch */
function FormulaCard({ price, discount }: { price: number; discount: number }) {
  const c = yearlyCalc(price, discount);
  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Calculator className="h-3.5 w-3.5 text-golddk" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Công thức tính</span>
      </div>
      <p className="mb-2.5 rounded-lg bg-white px-2.5 py-1.5 text-center font-mono text-[12px] text-gray-600 ring-1 ring-inset ring-black/5">
        Giá năm = Giá tháng × 12 × (1 − <span className="text-golddk">{discount}%</span>)
      </p>
      <div className="space-y-1 font-mono text-[11.5px] text-gray-500">
        <div className="flex items-center justify-between gap-2">
          <span>= {fmtVnd(price)} × 12 × {(1 - c.disc).toFixed(2)}</span>
          <span className="text-gray-400">→ bước 1</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>= {fmtVnd(c.annualFull)} × {(1 - c.disc).toFixed(2)}</span>
          <span className="text-gray-400">→ bước 2</span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-black/5 pt-2.5">
        <div className="rounded-lg bg-gold/15 p-2 text-center">
          <p className="text-[13.5px] font-bold text-golddk">{fmtVnd(c.annual)}đ</p>
          <p className="text-[10px] text-golddk/80">Giá 1 năm</p>
        </div>
        <div className="rounded-lg bg-white p-2 text-center ring-1 ring-inset ring-black/5">
          <p className="text-[13.5px] font-bold text-ink">{fmtVnd(c.perMonth)}đ</p>
          <p className="text-[10px] text-gray-400">Quy đổi/tháng</p>
        </div>
        <div className="rounded-lg bg-emerald-600/10 p-2 text-center">
          <p className="text-[13.5px] font-bold text-emerald-700">{fmtVnd(c.saved)}đ</p>
          <p className="text-[10px] text-emerald-600">Tiết kiệm</p>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-emerald-600">
        ≈ tiết kiệm {c.freeMonths.toFixed(1)} tháng phí · giảm {discount}% so với trả theo tháng
      </p>
    </div>
  );
}

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

function PlanCard({
  plan,
  billing,
  onEdit,
  onDelete,
}: {
  plan: SubscriptionPlan;
  billing: Billing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const price = computePrice(plan, billing);
  const included = plan.features.filter((f) => f.included);
  const excluded = plan.features.filter((f) => !f.included);
  const limit = (label: string, v: number | string) => (
    <div className="rounded-xl bg-white/70 p-2 text-center ring-1 ring-inset ring-black/5">
      <p className="text-[13px] font-bold text-ink">{typeof v === "number" ? (v < 0 ? "∞" : fmtVnd(v)) : v}</p>
      <p className="text-[10.5px] text-gray-400">{label}</p>
    </div>
  );

  return (
    <Card className="flex flex-col overflow-hidden transition hover-lift">
      <div className="h-1.5 w-full" style={{ backgroundColor: plan.color }} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: plan.color }}>
              {plan.popular ? <Crown className="h-[18px] w-[18px]" /> : <CircleDollarSign className="h-[18px] w-[18px]" />}
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">{plan.name}</h3>
              <span className="text-[11px] text-gray-400">{fmtVnd(plan.subscribers)} thuê bao</span>
            </div>
          </div>
          <Badge tone={statusMap[plan.status].tone}>{statusMap[plan.status].label}</Badge>
        </div>

        {plan.popular && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-[#8a5e08]">
            <Sparkles className="h-3 w-3" /> Phổ biến nhất
          </span>
        )}

        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-bold tracking-tight text-ink">{price.amount}</span>
            <span className="text-[12px] text-gray-400">{price.suffix}</span>
          </div>
          {price.perMonth && (
            <p className="mt-0.5 text-[11.5px] text-gray-400">
              ≈ {price.perMonth} · <span className="font-semibold text-emerald-600">tiết kiệm {price.saved}/năm</span>
            </p>
          )}
          {billing === "yearly" && !price.yearlySupported && !price.isZero && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-gray-500 ring-1 ring-inset ring-black/5">
              <CalendarDays className="h-3 w-3" /> Chỉ thanh toán theo tháng
            </p>
          )}
          {plan.yearlyBilling && billing === "monthly" && !price.isZero && (
            <p className="mt-1 text-[11px] text-gray-400">Có hỗ trợ thanh toán năm · giảm {plan.yearlyDiscount}%</p>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500">{plan.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {limit("Dự án", plan.limits.projects)}
          {limit("Sơ đồ", plan.limits.diagrams)}
          {limit("AI query", plan.limits.aiQueries)}
          {limit("Cộng tác viên", plan.limits.collaborators)}
        </div>

        <div className="mt-4 space-y-1.5 border-t border-black/5 pt-3">
          {included.map((f) => (
            <div key={f.key} className="flex items-center gap-2 text-[12.5px] text-gray-700">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{f.label}</span>
            </div>
          ))}
          {excluded.slice(0, 2).map((f) => (
            <div key={f.key} className="flex items-center gap-2 text-[12.5px] text-gray-300">
              <X className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate line-through">{f.label}</span>
            </div>
          ))}
          {excluded.length > 2 && (
            <p className="pl-5 text-[11.5px] text-gray-400">+ {excluded.length - 2} tính năng khác bị tắt</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-3">
          <Button variant="secondary" onClick={onEdit} className="flex-1 justify-center"><Pencil className="h-4 w-4" /> Chỉnh sửa</Button>
          <button onClick={onDelete} className="inline-flex items-center justify-center rounded-full border border-black/5 bg-white/80 p-2 text-gray-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function PlanRow({
  plan,
  billing,
  onEdit,
  onDelete,
}: {
  plan: SubscriptionPlan;
  billing: Billing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const price = computePrice(plan, billing);
  const includedCount = plan.features.filter((f) => f.included).length;
  const totalFeatures = plan.features.length;
  const lim = (v: number) => (v < 0 ? "∞" : fmtVnd(v));

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-soft transition hover:bg-white/90">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: plan.color }}>
        {plan.popular ? <Crown className="h-[18px] w-[18px]" /> : <CircleDollarSign className="h-[18px] w-[18px]" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13.5px] font-bold text-ink">{plan.name}</p>
          {plan.popular && (
            <span className="inline-flex items-center gap-0.5 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-[#8a5e08]">
              <Sparkles className="h-2.5 w-2.5" /> Phổ biến
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-gray-400">{plan.description}</p>
      </div>

      <div className="hidden w-28 shrink-0 text-right sm:block">
        <p className="text-[13px] font-bold text-ink">{price.amount}</p>
        <p className="text-[11px] text-gray-400">{price.suffix}</p>
        {billing === "yearly" && !price.yearlySupported && !price.isZero && (
          <p className="text-[10px] text-gray-400">Chỉ tháng</p>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-3 text-center lg:flex">
        {[
          { l: "Dự án", v: lim(plan.limits.projects) },
          { l: "Sơ đồ", v: lim(plan.limits.diagrams) },
          { l: "AI", v: lim(plan.limits.aiQueries) },
        ].map((x) => (
          <div key={x.l} className="w-12">
            <p className="text-[13px] font-bold text-ink">{x.v}</p>
            <p className="text-[10px] text-gray-400">{x.l}</p>
          </div>
        ))}
      </div>

      <div className="hidden w-20 shrink-0 text-center md:block">
        <p className="text-[13px] font-bold text-ink">{includedCount}/{totalFeatures}</p>
        <p className="text-[10px] text-gray-400">tính năng</p>
      </div>

      <div className="hidden w-20 shrink-0 text-right xl:block">
        <p className="text-[13px] font-bold text-ink">{fmtVnd(plan.subscribers)}</p>
        <p className="text-[10px] text-gray-400">thuê bao</p>
      </div>

      <Badge tone={statusMap[plan.status].tone}>{statusMap[plan.status].label}</Badge>

      <div className="flex shrink-0 items-center gap-0.5">
        <button onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-ink"><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function LimitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const unlim = unlimited(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-ink">{label}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-400">
          <Switch on={unlim} onClick={() => onChange(unlim ? 0 : -1)} />
          Không giới hạn
        </label>
      </div>
      <input
        type="number"
        disabled={unlim}
        value={unlim ? "" : value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        placeholder={unlim ? "∞" : "0"}
        className={cn(inputCls, unlim && "cursor-not-allowed bg-white/40 text-gray-400")}
      />
    </div>
  );
}

function PlanEditor({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const [newFeature, setNewFeature] = useState("");
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const setLimit = (patch: Partial<PlanLimits>) => set({ limits: { ...draft.limits, ...patch } });

  const addCustomFeature = () => {
    const label = newFeature.trim();
    if (!label) return;
    const key = `custom_${label}`;
    if (draft.customFeatures.includes(label)) return;
    set({
      customFeatures: [...draft.customFeatures, label],
      features: { ...draft.features, [key]: true },
    });
    setNewFeature("");
  };
  const removeCustomFeature = (label: string) => {
    const key = `custom_${label}`;
    const { [key]: _omit, ...rest } = draft.features;
    set({ customFeatures: draft.customFeatures.filter((f) => f !== label), features: rest });
  };

  return (
    <div className="space-y-5">
      {/* basic info */}
      <div>
        <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-400">Thông tin chung</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-semibold text-ink">Tên gói</span>
            <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="VD: Pro" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12.5px] font-semibold text-ink">Trạng thái</span>
            <div className="relative">
              <select value={draft.status} onChange={(e) => set({ status: e.target.value as PlanStatus })} className={cn(inputCls, "appearance-none pr-9")}>
                <option value="active">Đang hoạt động</option>
                <option value="draft">Bản nháp</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink">Mô tả</span>
          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="Mô tả ngắn về gói…" className={cn(inputCls, "resize-none")} />
        </label>
      </div>

      {/* pricing */}
      <div>
        <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-400">Giá & chu kỳ thanh toán</p>

        <label className="mb-3 flex cursor-pointer items-center justify-between rounded-2xl border border-black/5 bg-white/60 p-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <CircleDollarSign className="h-4 w-4 text-gray-400" /> Giá theo thoả thuận (báo giá riêng)
          </span>
          <Switch on={draft.contactOnly} onClick={() => set({ contactOnly: !draft.contactOnly })} />
        </label>

        {!draft.contactOnly && (
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" /> Giá hàng tháng (VNĐ)
              <span className="font-normal text-gray-400">— đặt 0 cho gói miễn phí</span>
            </span>
            <input type="number" value={draft.price} onChange={(e) => set({ price: Math.max(0, parseInt(e.target.value) || 0) })} className={inputCls} />
          </label>
        )}

        {!draft.contactOnly && draft.price > 0 && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 transition">
            <button
              type="button"
              onClick={() => set({ yearlyBilling: !draft.yearlyBilling })}
              className={cn("flex w-full items-center justify-between gap-3 p-3 text-left transition", draft.yearlyBilling ? "bg-gold/10" : "bg-white hover:bg-white/60")}
            >
              <span className="flex items-center gap-2.5">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition", draft.yearlyBilling ? "bg-gold text-white" : "bg-surface text-gray-500")}>
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-ink">Hỗ trợ thanh toán theo năm</span>
                  <span className="block text-[11.5px] text-gray-400">{draft.yearlyBilling ? "Đang bật — khách hàng có thể trả 1 lần cả năm để được giảm giá." : "Mặc định chỉ thanh toán theo tháng."}</span>
                </span>
              </span>
              <Switch on={draft.yearlyBilling} onClick={() => set({ yearlyBilling: !draft.yearlyBilling })} />
            </button>

            {draft.yearlyBilling && (
              <div className="animate-fade-in space-y-3 border-t border-black/5 bg-white/60 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                      <BadgePercent className="h-3.5 w-3.5 text-emerald-600" /> Mức giảm giá năm
                    </span>
                    <div className="relative">
                      <select
                        value={discountLevels.includes(draft.yearlyDiscount) ? draft.yearlyDiscount : "custom"}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          set({ yearlyDiscount: isNaN(v) ? draft.yearlyDiscount : v });
                        }}
                        className={cn(inputCls, "appearance-none pr-9")}
                      >
                        {discountLevels.map((d) => (
                          <option key={d} value={d}>Giảm {d}%</option>
                        ))}
                        <option value="custom">Tự nhập %…</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </label>
                  {!discountLevels.includes(draft.yearlyDiscount) && (
                    <label className="block">
                      <span className="mb-1 block text-[12.5px] font-semibold text-ink">% giảm (0 – 50)</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={draft.yearlyDiscount}
                        onChange={(e) => set({ yearlyDiscount: Math.min(50, Math.max(0, parseInt(e.target.value) || 0)) })}
                        className={inputCls}
                      />
                    </label>
                  )}
                </div>

                <FormulaCard price={draft.price} discount={draft.yearlyDiscount} />
              </div>
            )}
          </div>
        )}

        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-black/5 bg-white/60 p-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Crown className="h-4 w-4 text-gold" /> Đánh dấu là gói phổ biến
          </span>
          <Switch on={draft.popular} onClick={() => set({ popular: !draft.popular })} />
        </label>
      </div>

      {/* limits */}
      <div>
        <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-gray-400">Giới hạn sử dụng</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <LimitField label="Số dự án" value={draft.limits.projects} onChange={(v) => setLimit({ projects: v })} />
          <LimitField label="Số sơ đồ UML" value={draft.limits.diagrams} onChange={(v) => setLimit({ diagrams: v })} />
          <LimitField label="Lượt AI query" value={draft.limits.aiQueries} onChange={(v) => setLimit({ aiQueries: v })} />
          <LimitField label="Số cộng tác viên" value={draft.limits.collaborators} onChange={(v) => setLimit({ collaborators: v })} />
        </div>
      </div>

      {/* features */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">Tính năng đi kèm</p>
          <span className="text-[11px] text-gray-400">{Object.values(draft.features).filter(Boolean).length}/{featureCatalog.length + draft.customFeatures.length} bật</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {featureCatalog.map((f) => {
            const on = draft.features[f.key];
            return (
              <button
                key={f.key}
                onClick={() => set({ features: { ...draft.features, [f.key]: !on } })}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition",
                  on ? "border-ink bg-white/70" : "border-black/5 hover:bg-white/60"
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border transition", on ? "border-ink bg-ink text-white" : "border-black/15 bg-white")}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="text-[12.5px] text-gray-700">{f.label}</span>
              </button>
            );
          })}
          {draft.customFeatures.map((label) => {
            const key = `custom_${label}`;
            const on = draft.features[key];
            return (
              <div key={key} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition", on ? "border-ink bg-white/70" : "border-black/5")}>
                <button onClick={() => set({ features: { ...draft.features, [key]: !on } })} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition", on ? "border-ink bg-ink text-white" : "border-black/15 bg-white")}>
                  {on && <Check className="h-3 w-3" />}
                </button>
                <span className="flex-1 truncate text-[12.5px] text-gray-700">{label}</span>
                <button onClick={() => removeCustomFeature(label)} className="shrink-0 rounded p-0.5 text-gray-300 transition hover:bg-rose-50 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustomFeature()}
            placeholder="Thêm tính năng riêng…"
            className={cn(inputCls, "border-dashed border-black/15")}
          />
          <Button onClick={addCustomFeature} className={cn(!newFeature.trim() && "opacity-40")}><Plus className="h-4 w-4" /> Thêm</Button>
        </div>
      </div>

      {/* accent color */}
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gray-400">Màu nhận diện</p>
        <div className="flex flex-wrap items-center gap-2">
          {accentColors.map((c) => (
            <button
              key={c}
              onClick={() => set({ color: c })}
              className={cn("h-7 w-7 rounded-full transition", draft.color === c ? "ring-2 ring-ink ring-offset-2" : "ring-1 ring-black/10")}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="relative ml-1 flex items-center gap-2">
            <label
              className={cn(
                "flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 transition",
                accentColors.includes(draft.color) ? "ring-black/10" : "ring-2 ring-ink ring-offset-2"
              )}
              style={{ backgroundColor: accentColors.includes(draft.color) ? "#fff" : draft.color }}
              title="Chọn màu tự do"
            >
              <Palette className={cn("h-3.5 w-3.5", accentColors.includes(draft.color) ? "text-gray-500" : "text-white")} />
              <input type="color" value={accentColors.includes(draft.color) ? "#e4a11b" : draft.color} onChange={(e) => set({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <input value={draft.color} onChange={(e) => set({ color: e.target.value })} className="w-20 rounded-lg border border-black/5 bg-white/70 px-2 py-1 text-center font-mono text-[11px] uppercase text-ink outline-none focus:border-gold focus:bg-white focus:ring-4 focus:ring-gold/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

function toDraft(plan: SubscriptionPlan): Draft {
  const features: Record<string, boolean> = {};
  featureCatalog.forEach((f) => (features[f.key] = plan.features.some((p) => p.key === f.key && p.included)));
  const customFeatures: string[] = [];
  plan.features.filter((p) => !isCatalogKey(p.key)).forEach((p) => { customFeatures.push(p.label); features[p.key] = p.included; });
  return {
    id: plan.id, mode: "edit", name: plan.name, description: plan.description, price: plan.price,
    contactOnly: plan.contactOnly, yearlyBilling: plan.yearlyBilling, yearlyDiscount: plan.yearlyDiscount,
    status: plan.status, popular: plan.popular, subscribers: plan.subscribers, color: plan.color,
    features, customFeatures, limits: { ...plan.limits },
  };
}

function blankDraft(): Draft {
  const features: Record<string, boolean> = {};
  featureCatalog.forEach((f) => (features[f.key] = false));
  return {
    id: 0, mode: "create", name: "", description: "", price: 0, contactOnly: false,
    yearlyBilling: false, yearlyDiscount: 20, status: "draft", popular: false, subscribers: 0,
    color: accentColors[0], features, customFeatures: [],
    limits: { projects: 5, diagrams: 50, aiQueries: 100, collaborators: 1 },
  };
}

function draftToPlan(d: Draft, base?: SubscriptionPlan): SubscriptionPlan {
  const features: PlanFeature[] = featureCatalog.map((f) => ({ key: f.key, label: f.label, included: !!d.features[f.key] }));
  d.customFeatures.forEach((label) => {
    features.push({ key: `custom_${label}`, label, included: !!d.features[`custom_${label}`] });
  });
  return {
    id: base?.id ?? d.id, name: d.name.trim() || "Gói chưa đặt tên", description: d.description.trim() || "—",
    price: d.contactOnly ? 0 : d.price, contactOnly: d.contactOnly, yearlyBilling: d.yearlyBilling && !d.contactOnly,
    yearlyDiscount: d.yearlyDiscount, status: d.status, popular: d.popular, subscribers: d.subscribers,
    color: d.color, features, limits: d.limits,
  };
}

export default function Subscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(subscriptionPlans);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDel, setConfirmDel] = useState<SubscriptionPlan | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [billing, setBilling] = useState<Billing>("monthly");

  const activePlans = plans.filter((p) => p.status === "active").length;
  const totalSubs = plans.reduce((s, p) => s + p.subscribers, 0);
  const yearlyCount = plans.filter((p) => p.yearlyBilling).length;
  const mrr = plans.filter((p) => p.status === "active").reduce((s, p) => s + p.price * p.subscribers, 0);

  function save() {
    if (!draft) return;
    if (draft.mode === "edit") {
      const base = plans.find((p) => p.id === draft.id);
      const updated = draftToPlan(draft, base);
      setPlans((arr) => arr.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const newPlan = draftToPlan({ ...draft, id: Date.now() });
      setPlans((arr) => [...arr, newPlan]);
    }
    setDraft(null);
  }
  function doDelete() {
    if (!confirmDel) return;
    setPlans((arr) => arr.filter((p) => p.id !== confirmDel.id));
    setConfirmDel(null);
  }

  const editing = draft?.mode === "edit";

  return (
    <div className="space-y-5">
      <PageHeader title="Gói Subscription" subtitle="Tạo gói và cấu hình tính năng, giá & chu kỳ thanh toán" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CircleDollarSign} label="Tổng số gói" value={String(plans.length)} />
        <StatCard icon={Zap} label="Gói đang hoạt động" value={String(activePlans)} />
        <StatCard icon={Users} label="Tổng thuê bao" value={fmtVnd(totalSubs)} delta="+5,2%" />
        <StatCard icon={TrendingUp} label="MRR ước tính" value={`${fmtVnd(mrr)}đ`} delta="+9,1%" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-ink">Các gói subscription</h3>
            <p className="text-[13px] text-gray-500">Tạo gói và bật/tắt từng tính năng đi kèm.</p>
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { id: "grid", label: "", icon: <LayoutGrid className="h-4 w-4" /> },
                { id: "list", label: "", icon: <List className="h-4 w-4" /> },
              ]}
            />
            <Button onClick={() => setDraft(blankDraft())}><Plus className="h-4 w-4" /> Tạo gói</Button>
          </div>
        </div>

        {/* billing cycle toggle */}
        <div className="mb-5 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/50 py-3 sm:flex-row sm:gap-4">
          <div className="inline-flex rounded-full border border-white/60 bg-surface p-0.5 shadow-soft">
            {(["monthly", "yearly"] as const).map((b) => {
              const disabled = b === "yearly" && yearlyCount === 0;
              return (
                <button
                  key={b}
                  onClick={() => !disabled && setBilling(b)}
                  disabled={disabled}
                  title={disabled ? "Chưa có gói nào bật thanh toán năm" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition",
                    billing === b ? "bg-ink text-white" : "text-gray-600 hover:text-ink",
                    disabled && "cursor-not-allowed opacity-40 hover:text-gray-600"
                  )}
                >
                  {b === "monthly" ? "Hàng tháng" : "Hàng năm"}
                  {b === "yearly" && (
                    <span className={cn("rounded px-1 text-[10px]", billing === b ? "bg-white/20" : "bg-white/70 text-gray-500")}>
                      {yearlyCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {billing === "yearly" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-0.5 text-[12px] font-semibold text-emerald-700">
              <BadgePercent className="h-3.5 w-3.5" /> {yearlyCount} gói hỗ trợ giảm giá theo năm
            </span>
          ) : (
            <span className="text-[12px] text-gray-400">
              {yearlyCount > 0 ? `${yearlyCount} gói đang bật thanh toán năm — chuyển sang xem giá ưu đãi` : "Bật thanh toán năm trong từng gói để hiển thị giá ưu đãi"}
            </span>
          )}
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {plans.map((p) => (
              <PlanCard key={p.id} billing={billing} plan={p} onEdit={() => setDraft(toDraft(p))} onDelete={() => setConfirmDel(p)} />
            ))}
            <button
              onClick={() => setDraft(blankDraft())}
              className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/10 text-gray-400 transition hover:border-gold hover:text-golddk"
            >
              <Plus className="h-7 w-7" />
              <span className="text-[13px] font-semibold">Tạo gói mới</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 md:flex">
              <span className="w-9 shrink-0" />
              <span className="flex-1">Gói</span>
              <span className="hidden w-28 shrink-0 text-right sm:block">Giá</span>
              <span className="hidden w-[150px] shrink-0 lg:block">Giới hạn</span>
              <span className="hidden w-20 shrink-0 text-center md:block">Tính năng</span>
              <span className="hidden w-20 shrink-0 text-right xl:block">Thuê bao</span>
              <span className="w-[68px] shrink-0">Trạng thái</span>
              <span className="w-[72px] shrink-0 text-right">Thao tác</span>
            </div>
            {plans.map((p) => (
              <PlanRow key={p.id} billing={billing} plan={p} onEdit={() => setDraft(toDraft(p))} onDelete={() => setConfirmDel(p)} />
            ))}
            <button
              onClick={() => setDraft(blankDraft())}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 py-4 text-[13px] font-semibold text-gray-400 transition hover:border-gold hover:text-golddk"
            >
              <Plus className="h-5 w-5" /> Tạo gói mới
            </button>
          </div>
        )}
      </Card>

      {/* create / edit modal */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={editing ? "Chỉnh sửa gói" : "Tạo gói subscription"}
        desc={editing ? draft?.name : "Cấu hình giá, giới hạn và tính năng cho gói"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}><X className="h-4 w-4" /> Huỷ</Button>
            <Button onClick={save}><Check className="h-4 w-4" /> {editing ? "Lưu thay đổi" : "Tạo gói"}</Button>
          </>
        }
      >
        {draft && <PlanEditor draft={draft} setDraft={setDraft} />}
      </Modal>

      {/* delete confirm */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Xoá gói subscription?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <button onClick={doDelete} className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-rose-700"><Trash2 className="h-4 w-4" /> Xoá gói</button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-gray-600">
          Gói <b className="text-ink">{confirmDel?.name}</b> đang có <b className="text-ink">{fmtVnd(confirmDel?.subscribers ?? 0)}</b> thuê bao sẽ bị xoá. Người dùng đang sử dụng gói này sẽ cần được chuyển sang gói khác. Hành động không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}
