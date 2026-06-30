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
}: {
  result: ParseResult;
  summary: string;
  onApply: (nodes: FlowNode[], edges: FlowEdge[], type?: DiagramType) => void;
  onResolved: (text: string) => void;
}) {
  const questions: ImportQuestion[] = result.questions ?? [];
  const realTotal = questions.length;
  const total = realTotal + 1; // + notes page

  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const appliedOnce = useRef(false);

  const isNotesPage = page === total - 1;
  const q = !isNotesPage ? questions[page] : undefined;
  const multiple = !!q?.multiple;
  const ans = q ? answers[q.id] : undefined;
  const allAnswered = questions.every(
    (qq) => qq.multiple || answeredSingle(answers[qq.id])
  );

  /* ---------- collapsed summary ---------- */
  if (done && !reviewing) {
    return (
      <div className="animate-fade-in rounded-xl border border-[var(--line)] bg-white p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-zinc-900">Relationships confirmed</p>
            <p className="truncate text-[11px] text-zinc-400">
              {realTotal} answer{realTotal === 1 ? "" : "s"} · {notes ? "with notes" : "no notes"} · click Review to see
            </p>
          </div>
          <button onClick={() => setReviewing(true)} className="flex items-center gap-1 rounded-lg border border-[var(--line-strong)] px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900">
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
      <div className="animate-fade-in rounded-xl border border-zinc-900/15 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          <p className="flex-1 text-[12.5px] font-semibold text-zinc-900">Your choices (read-only)</p>
          <button onClick={() => setReviewing(false)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Hide
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto scroll-thin px-4 py-2.5">
          {questions.map((qq, i) => (
            <div key={qq.id} className="flex items-start gap-2 border-b border-[var(--line)] py-2 last:border-0">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] leading-snug text-zinc-500">{qq.prompt} <span className="text-zinc-300">· {qq.multiple ? "multi" : "single"}</span></p>
                <p className="mt-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[12px] font-medium text-white">{answerLabel(answers[qq.id])}</p>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 pt-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500">✎</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] leading-snug text-zinc-500">Anything to add?</p>
              <p className="mt-0.5 text-[12px] text-zinc-700">{notes ? notes : <span className="text-zinc-300">— left blank</span>}</p>
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

  const otherActive = multiple ? ans?.kind === "multiple" && ans.other !== undefined : ans?.kind === "other";
  const toggleOther = () => {
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
    if (multiple) {
      const cur = ans?.kind === "multiple" ? ans : { kind: "multiple" as const, options: [], other: "" };
      setAns({ kind: "multiple", options: cur.options, other: text });
    } else {
      setAns({ kind: "other", text });
    }
  };
  const otherText = multiple ? (ans?.kind === "multiple" ? ans.other ?? "" : "") : ans?.kind === "other" ? ans.text : "";

  const doApply = () => {
    if (!allAnswered) return;
    const applied = applyAnswers(result, answers);
    onApply(applied.nodes, applied.edges, applied.type);
    setDone(true);
    if (!appliedOnce.current) {
      appliedOnce.current = true;
      onResolved(`Applied ${summary} — confirmed your answers${notes ? ` with notes: "${notes}"` : ""}. You can review them anytime.`);
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
          <p className="text-[12.5px] font-semibold text-zinc-900">{isNotesPage ? "Anything to add?" : q!.prompt}</p>
          <p className="text-[10.5px] text-zinc-400">{isNotesPage ? "Optional — supplementary notes for the AI" : multiple ? "Multiple choice — select any" : "Single choice — pick one"}</p>
        </div>
        {!isNotesPage && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-zinc-500">{multiple ? "Multi" : "Single"}</span>}
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
        ) : (
          <>
            {q!.detail && <p className="mb-2 text-[11px] text-zinc-400">{q!.detail}</p>}
            <div className="grid grid-cols-2 gap-1.5">
              {q!.options.map((o) => {
                const active = multiple ? ans?.kind === "multiple" && ans.options.some((x) => x.label === o.label) : ans?.kind === "option" && ans.option.label === o.label;
                return (
                  <button key={o.label} onClick={() => (multiple ? toggleMultiOption(o) : toggleSingleOption(o))} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition-all ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-[var(--line)] bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                    <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${multiple ? "rounded-[3px]" : "rounded-full"} ${active ? "border-white bg-white text-zinc-900" : "border-zinc-300"}`}>
                      {active && (multiple ? (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
                      ))}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>

            <button onClick={toggleOther} className={`mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${otherActive ? "border-zinc-900 bg-zinc-50 text-zinc-900" : "border-dashed border-[var(--line-strong)] text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"}`}>
              <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${otherActive ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
                {otherActive && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              Other
              {multiple && otherActive && otherText.trim() && <span className="ml-auto truncate text-[11px] font-normal text-zinc-400">"{otherText.trim()}"</span>}
            </button>
            {otherActive && (
              <div className="mt-1.5 flex gap-1.5">
                <input autoFocus value={otherText} placeholder="Type a custom value…" onChange={(e) => setOtherText(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[12px] outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-2.5">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back
        </button>
        <span className="text-[11px] tabular-nums text-zinc-400">{Object.keys(answers).length}/{realTotal} answered</span>
        {page < total - 1 ? (
          <button onClick={() => setPage((p) => Math.min(total - 1, p + 1))} className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800">
            Next
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        ) : (
          <button onClick={doApply} disabled={!allAnswered} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            Apply
          </button>
        )}
      </div>
    </div>
  );
}
