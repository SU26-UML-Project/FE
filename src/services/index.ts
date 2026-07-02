/**
 * API service layer. Most functions are currently COMMENTED stubs — the app
 * runs fully offline with localStorage + a local Mermaid/PlantUML parser.
 *
 * To go live (see docs/BUILD.md §7 + docs/SYSTEM_PROMPT.md):
 *   1. Implement the functions in each file.
 *   2. Replace MOCK logic:
 *      - panels/AIChat.tsx `submit()` → anythingllmService `sendChat`
 *      - store/sheetStore → projectService `loadProject` / `saveSheet`
 *      - store/chatStore  → anythingllmService (history CRUD)
 *      - lib/importers.EXAMPLES → templateService
 *
 * Data-flow reference:
 *   Workspace flow  → projectService (load/save sheets) + workspaceStore
 *   AI flow         → anythingllmService (chat) + canvasStore (draw result)
 */
export type { ChatRequest, AIResponse } from "./anythingllmService";
export type { DiagramTemplate } from "./templateService";
export { projectService } from "./projectService";
export { sheetService } from "./sheetService";
export type { SheetRequest, SheetResponse } from "./sheetService";
export { socketService } from "./socketService";
export type { CursorData, SelectionData, CanvasChangeData } from "./socketService";
export {} from "./templateService";
