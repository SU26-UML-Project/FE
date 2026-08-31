import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import vi from "./vi.json";
import en from "./en.json";

export type Lang = "vi" | "en";

/** Dictionaries imported from src/langue/*.json */
const dicts: Record<Lang, unknown> = { vi, en };

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

/**
 * Global language store — persisted to localStorage so the choice survives
 * reloads. Default is Vietnamese (the product's primary audience).
 */
export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "vi",
      setLang: (lang) => set({ lang }),
    }),
    { name: "diauml:lang" }
  )
);

/** Walk a dot-path ("footer.product.title") through the dictionary. */
function resolve(dict: unknown, path: string): unknown {
  let node: unknown = dict;
  for (const segment of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

export type TFunc = ((key: string, params?: Record<string, string | number>) => string) & {
  /** Resolve a JSON array of strings (e.g. "templates.alts"). */
  list: (key: string) => string[];
};

function makeT(lang: Lang): TFunc {
  const dict = dicts[lang];
  const fallback = dicts.vi;
  const t = ((key: string, params?: Record<string, string | number>) => {
    const raw = resolve(dict, key) ?? resolve(fallback, key);
    return typeof raw === "string" ? interpolate(raw, params) : key;
  }) as TFunc;
  t.list = (key: string) => {
    const raw = resolve(dict, key) ?? resolve(fallback, key);
    return Array.isArray(raw) ? raw.map(String) : [];
  };
  return t;
}

/**
 * Translation hook bound to the active language — components re-render
 * automatically when the user switches VI ⇄ EN.
 */
export function useT(): TFunc {
  const lang = useLangStore((s) => s.lang);
  return useMemo(() => makeT(lang), [lang]);
}

/** Read-only accessor for non-hook contexts (rare). */
export function getT(lang: Lang): TFunc {
  return makeT(lang);
}
