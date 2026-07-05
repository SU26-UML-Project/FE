import { useRef, useState } from "react";
import {
  applyAnswers,
  type Answer,
  type ImportQuestion,
  type ParseResult,
  type QuestionOption,
} from "../../lib/importers";
import type { DiagramType, FlowEdge, FlowNode } from "../../types";

/** Is a single-select answer actually filled in? */
function answeredSingle(a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.kind === "option") return true;
  if (a.kind === "other") return a.text.trim().length > 0;
  return false;
}

/** Human-readable summary of any answer (for the read-only review). */
function answerLabel(a: Answer | undefined): string {
  if (!a) return "—";
  if (a.kind === "option") return a.option.label;
  if (a.kind === "multiple") {
    const labels = a.options.map((o) => o.label);
    if (a.other) labels.push(a.other);
    return labels.length ? labels.join(", ") : "—";
  }
  return a.text.trim() || "—";
}

/**
 * Human-in-the-loop card rendered INLINE in the chat stream.
 * Single- or multiple-select per question (decided by AI); free Back/Next;
 * always an "Other" checkbox revealing a text input; Apply only enabled once
 * every required (single-select) question is answered; last page is optional
 * notes. After applying it collapses; Review re-opens a read-only list.
 */
export function QuestionCard({
  result,
  summary,
  onApply,
  onResolved,
  initialAnswers,
  initialDone,
  initialNotes,
}: {
  result: ParseResult;
  summary: string;
  onApply: (nodes: FlowNode[], edges: FlowEdge[], type?: DiagramType) => void;
  onResolved: (text: string) => void;
  initialAnswers?: Record<string, Answer>;
  initialDone?: boolean;
  initialNotes?: string;
}) {
  const questions: ImportQuestion[] = result.questions ?? [];
  const realTotal = questions.length;
  const total = realTotal + 1; // + notes page

  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers || {});
  const [notes, setNotes] = useState(initialNotes || "");
  const [done, setDone] = useState(initialDone || false);
  const [reviewing, setReviewing] = useState(false);
  const appliedOnce = useRef(initialDone || false);

  const isNotesPage = page === total - 1;
  const q = !isNotesPage && questions ? questions[page] : undefined;
  const multiple = !!q?.multiple;
  const ans = q ? answers[q.id] : undefined;
  const allAnswered = questions.every(
    (qq) => qq.multiple || (qq.options && qq.options.length === 0) || answeredSingle(answers[qq.id])
  );

  /* ---------- collapsed summary ---------- */
  if (done && !reviewing) {
    return (
      <div className="animate-fade-in rounded-xl border border-admin-outline/30 bg-white p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-primary text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-admin-on-surface">Relationships confirmed</p>
            <p className="truncate text-[11px] text-admin-secondary/60">
              {realTotal} answer{realTotal === 1 ? "" : "s"} · {notes ? "with notes" : "no notes"} · click Review to see
            </p>
          </div>
          <button onClick={() => setReviewing(true)} className="flex items-center gap-1 rounded-lg border border-admin-outline/30 px-2.5 py-1.5 text-[11.5px] font-bold text-admin-secondary transition-colors hover:border-admin-primary hover:text-admin-primary hover:bg-admin-bg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Review
          </button>
        </div>
      </div>
    );
  }

  /* ---------- read-only review ---------- */
  if (done && reviewing) {
    return (
      <div className="animate-fade-in rounded-xl border border-admin-outline/20 bg-white shadow-[0_2px_10px_rgba(0,74,198,0.05)]">
        <div className="flex items-center gap-2.5 border-b border-admin-outline/20 px-4 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-admin-bg text-admin-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <p className="flex-1 text-[12.5px] font-bold text-admin-on-surface">Your choices (read-only)</p>
          <button onClick={() => setReviewing(false)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Hide
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto scroll-thin px-4 py-2.5">
          {questions.map((qq, i) => (
            <div key={qq.id} className="flex items-start gap-2 border-b border-admin-outline/10 py-2 last:border-0">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-bg text-[10px] font-bold text-admin-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] leading-snug text-admin-secondary/80">{qq.prompt} <span className="text-admin-secondary/40">· {qq.multiple ? "multi" : "single"}</span></p>
                <p className="mt-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-admin-primary px-1.5 py-0.5 text-[12px] font-bold text-white">{answerLabel(answers[qq.id])}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 pt-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-bg text-[10px] font-bold text-admin-primary">✎</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] leading-snug text-admin-secondary/80">Anything to add?</p>
              <p className="mt-0.5 text-[12px] text-admin-on-surface font-medium">{notes ? notes : <span className="text-admin-secondary/40">— left blank</span>}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q && !isNotesPage) return null;

  /* ---------- answer mutators ---------- */
  const setAns = (next: Answer | undefined) =>
    setAnswers((p) => {
      if (!next) {
        const { [q!.id]: _omit, ...rest } = p;
        return rest;
      }
      return { ...p, [q!.id]: next };
    });

  const toggleSingleOption = (o: QuestionOption) => {
    if (ans?.kind === "option" && ans.option.label === o.label) setAns(undefined);
    else setAns({ kind: "option", option: o });
  };
  const toggleMultiOption = (o: QuestionOption) => {
    const cur = ans?.kind === "multiple" ? ans : { kind: "multiple" as const, options: [], other: undefined as string | undefined };
    const has = cur.options.some((x) => x.label === o.label);
    const options = has ? cur.options.filter((x) => x.label !== o.label) : [...cur.options, o];
    if (!options.length && !cur.other) setAns(undefined);
    else setAns({ kind: "multiple", options, other: cur.other });
  };

  const otherActive = q ? (multiple ? (ans?.kind === "multiple" && ans.other !== undefined) || q.options.length === 0 : ans?.kind === "other" || q.options.length === 0) : false;
  const toggleOther = () => {
    if (!q || q.options.length === 0) return; // Luôn mở nếu không có options
    if (multiple) {
      const cur = ans?.kind === "multiple" ? ans : { kind: "multiple" as const, options: [], other: undefined as string | undefined };
      const other = cur.other !== undefined ? undefined : "";
      if (!cur.options.length && other === undefined) setAns(undefined);
      else setAns({ kind: "multiple", options: cur.options, other });
    } else {
      if (ans?.kind === "other") setAns(undefined);
      else setAns({ kind: "other", text: "" });
    }
  };
  const setOtherText = (text: string) => {
    if (!q) return;
    if (multiple) {
      const cur = ans?.kind === "multiple" ? ans : { kind: "multiple" as const, options: [], other: "" };
      setAns({ kind: "multiple", options: cur.options, other: text });
    } else {
      setAns({ kind: "other", text });
    }
  };
  const otherText = q ? (multiple ? (ans?.kind === "multiple" ? ans.other ?? "" : "") : ans?.kind === "other" ? ans.text : (q.options.length === 0 ? (ans as any)?.text || "" : "")) : "";

  const doApply = () => {
    if (!allAnswered) return;
    const applied = applyAnswers(result, answers);
    onApply(applied.nodes, applied.edges, applied.type);
    setDone(true);
    if (!appliedOnce.current) {
      appliedOnce.current = true;
      // Trích xuất các câu trả lời để gửi cho AI
      const answerSummary = questions.map(qq => {
        const a = answers[qq.id];
        return `Q: ${qq.prompt} -> A: ${answerLabel(a)}`;
      }).join("; ");
      
      const fullResponse = `Đã xác nhận thông tin: ${answerSummary}${notes ? `. Ghi chú thêm: "${notes}"` : ""}. Hãy tiếp tục triển khai sơ đồ dựa trên các thông tin này.`;
      onResolved(fullResponse);
    }
  };

  /* ---------- open, paginated ---------- */
  return (
    <div className="animate-fade-in rounded-xl border border-zinc-900/15 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12" y2="17" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12.5px] font-semibold text-zinc-900">{isNotesPage ? "Anything to add?" : (q?.prompt || "Clarification needed")}</p>
          <p className="text-[10.5px] text-zinc-400">
            {isNotesPage 
              ? "Optional — supplementary notes for the AI" 
              : (!q || q.options.length === 0) 
                ? "Text input — type your answer" 
                : multiple 
                  ? "Multiple choice — select any" 
                  : "Single choice — pick one"}
          </p>
        </div>
        {!isNotesPage && q && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-zinc-500">{q.options.length === 0 ? "Text" : multiple ? "Multi" : "Single"}</span>}
        <span className="text-[10.5px] font-semibold tabular-nums text-zinc-400">{page + 1}/{total}</span>
      </div>

      <div className="px-4 pt-2.5">
        <div className="h-1 overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full rounded-full bg-zinc-900 transition-all duration-300" style={{ width: `${(page / Math.max(1, total - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="px-4 py-3">
        {isNotesPage ? (
          <div>
            <p className="text-[13px] font-medium leading-snug text-zinc-900">Do you want to add anything else?</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">Leave blank if nothing — this is just extra context.</p>
            <textarea autoFocus rows={3} value={notes} placeholder="e.g. treat all as one-way, future roles, etc." onChange={(e) => setNotes(e.target.value)} className="mt-2.5 w-full resize-none rounded-lg border border-[var(--line)] px-2.5 py-2 text-[12.5px] outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 scroll-thin" />
            {!allAnswered && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12" y2="16" />
                </svg>
                Answer all required (single-choice) questions before applying.
              </p>
            )}
          </div>
        ) : q && (
          <>
            {q.detail && <p className="mb-2 text-[11px] text-admin-secondary/40">{q.detail}</p>}
            {q.options.length > 0 && (
              <div className="flex flex-col gap-2">
                {q.options.map((o) => {
                  const active = multiple ? ans?.kind === "multiple" && ans.options.some((x) => x.label === o.label) : ans?.kind === "option" && ans.option.label === o.label;
                  return (
                    <button key={o.label} onClick={() => (multiple ? toggleMultiOption(o) : toggleSingleOption(o))} className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-bold transition-all ${active ? "border-admin-primary bg-admin-primary text-white shadow-md shadow-admin-primary/20" : "border-admin-outline/10 bg-white text-admin-secondary hover:border-admin-outline/30 hover:bg-admin-bg"}`}>
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${multiple ? "rounded-[4px]" : "rounded-full"} ${active ? "border-white bg-white text-admin-primary" : "border-admin-outline/30 bg-admin-bg/50"}`}>
                        {active && (multiple ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-admin-primary" />
                        ))}
                      </span>
                      <span className="block flex-1 leading-snug whitespace-normal break-words">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.options.length > 0 ? (
              <button onClick={toggleOther} className={`mt-2 flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-bold transition-colors ${otherActive ? "border-admin-primary bg-admin-bg text-admin-primary shadow-sm" : "border-dashed border-admin-outline/30 text-admin-secondary hover:border-admin-outline/60 hover:text-admin-on-surface"}`}>
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${otherActive ? "border-admin-primary bg-admin-primary text-white" : "border-admin-outline/30"}`}>
                  {otherActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                </span>
                <span className="flex-1 leading-snug">Other</span>
                {multiple && otherActive && otherText.trim() && <span className="ml-auto truncate text-[11px] font-normal text-admin-secondary/40">"{otherText.trim()}"</span>}
              </button>
            ) : null}
            
            {otherActive && (
              <div className="mt-1.5 flex gap-1.5">
                <input autoFocus value={otherText} placeholder={q.options.length === 0 ? "Type your answer here..." : "Type a custom value…"} onChange={(e) => setOtherText(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-admin-outline/30 px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-admin-primary focus:ring-4 focus:ring-admin-primary/5" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-admin-outline/30 px-4 py-2.5">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-admin-secondary transition-colors hover:bg-admin-bg hover:text-admin-on-surface disabled:opacity-30">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back
        </button>
        <span className="text-[11px] tabular-nums font-bold text-admin-secondary/40">{Object.keys(answers).length}/{realTotal} answered</span>
        {page < total - 1 ? (
          <button onClick={() => setPage((p) => Math.min(total - 1, p + 1))} className="flex items-center gap-1 rounded-lg bg-admin-primary px-3 py-1 text-[12px] font-bold text-white transition-colors hover:bg-blue-700 shadow-sm">
            Next
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        ) : (
          <button onClick={doApply} disabled={!allAnswered} className="flex items-center gap-1.5 rounded-lg bg-admin-primary px-3 py-1 text-[12px] font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-30 shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
