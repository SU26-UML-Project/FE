/**
 * App-wide configuration: localStorage keys, theme tokens, app metadata.
 * Centralised here so storage/service layers and stores share a single source
 * of truth (mirrors the `config/` folder of a standard Vite project).
 */

/** localStorage keys for persisted app state. */
export const STORAGE_KEYS = {
  sheets: "graphite:sheets:v1",
  activeSheet: "graphite:sheets:active",
  legacyDiagram: "graphite:diagram:v1", // migrated once, then removed
  chats: "graphite:chats:v1",
  activeChat: "graphite:chats:active",
  chatSeeded: "graphite:chats:seeded",
} as const;

/** Design tokens (kept in sync with assets/styles/index.css :root). */
export const THEME = {
  ink: "#18181b",
  inkSoft: "#3f3f46",
  line: "#e6e7e9",
  lineStrong: "#d4d6da",
  bg: "#ffffff",
  bgSoft: "#fafafa",
  muted: "#8a8f98",
} as const;

export const APP_NAME = "Graphite";
export const APP_TAGLINE = "Diagram Studio";
