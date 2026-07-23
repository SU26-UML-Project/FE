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
export type { DiagramTemplate } from "../features/templates/api/templateApi";
export { projectService } from "../features/projects/api/projectApi";
export { sheetService } from "../features/projects/api/sheetApi";
export type { SheetRequest, SheetResponse } from "../features/projects/api/sheetApi";
export { socketService } from "../features/workspace/api/socketService";
export type { CursorData, SelectionData, CanvasChangeData } from "../features/workspace/api/socketService";
export {} from "../features/templates/api/templateApi";
