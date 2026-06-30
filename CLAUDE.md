# CLAUDE.md

Guidance for Claude / AI assistants working in this repository. Keep changes small, intentional, and aligned with existing patterns.

---

## 1. Project Overview

Web-based **UML diagram editor** frontend. Supports Use Case and Class diagrams, Mermaid import, AI chat assistance, role-based dashboards, and Google OAuth2 auth.

- **Backend:** separate service (sibling of `FE/` under `UML/`). Calls go through `services/apiClient.ts` (Axios).
- **AI/RAG layer:** AnythingLLM (`services/anythingllmService.ts`).

> VN: Đây là FE cho hệ thống vẽ sơ đồ UML, tích hợp AI chat và quản lý workspace. BE nằm ở thư mục riêng.

---

## 2. Tech Stack

| Area | Choice |
|------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (+ `@tailwindcss/postcss`) |
| State | Zustand 5 + `zundo` (undo/redo) + `immer` |
| Routing | React Router v7 |
| Canvas | `@xyflow/react` (React Flow 12) + `@dagrejs/dagre` for auto-layout |
| HTTP | Axios |
| Notifications | `react-hot-toast` |
| Animation | `framer-motion`, `gsap` |
| Markdown | `react-markdown` + `remark-gfm` |
| Panels | `react-resizable-panels` |
| Icons | `lucide-react`, `react-icons` |

Scripts: `npm run dev` · `npm run build` · `npm run preview`

---

## 3. Directory Structure (`src/`)

```
App.tsx                  Root: routes, ProtectedRoute, OAuth2Handler, layout chrome
main.tsx                 Vite entry
index.css                Tailwind + globals (grid-background, uml-blue, etc.)

pages/                   Route-level components
  LandingPage, Pricing                              (public)
  UserDashboard, OnboardingPage, ProfilePage,       (USER/ADMIN)
  CanvasEditor, WorkspacePage, TemplateDetail,
  PrebuiltDetail
  AdminDashboard                                    (ADMIN)

components/
  Landing/      Navbar, Hero, Features, Templates, CTA, Footer
  Auth/         AuthModal
  Canvas/       GraphCanvas, CanvasToolbar, CodePanel, PropsPanel,
                ShapePanel, MermaidImportDialog, MarkerDefs
    custom-nodes/  Actor, UseCase, Class, Interface, SystemBoundary,
                   Note, BaseNode, registry.ts
    edges/         Association, Aggregation, Composition, Dependency,
                   Inheritance, Realization, Include, Extend,
                   UseCaseAssociation, index.ts
    forms/         Per-node property forms
  Workspace/    WorkspaceLayout, CanvasPanel, FilePanel, AIChatPanel,
                QuestionBox, WorkspaceToolbar
  Chat/         GlobalAIChatSidebar, AIChatWidget, QuestionBox
  admin/        AdminHeader, DocumentsTab, LlmProviderTab,
                WorkspaceConfigTab
  Profile/      ChangePasswordModal
  ui/           LoadingOverlay, UserMenu

stores/         useAuthStore, workspaceStore, canvasStore   (Zustand)
services/       apiClient, authService, projectService, sheetService,
                fileService, anythingllmService, aiAdminService
hooks/          useAutoLayout (dagre), useClickOutside, useEditableName,
                useOtpCountdown, usePasswordStrength, useScrollToBottom
utils/          auth (cookie helpers), templates, workspaceStorage,
                mermaid/{parser, layout, types}
types/          admin, auth, file, pricing, template, ai, api,
                project, workspace
assets/         images, images_features, images_populartemplate
```

---

## 4. Routing & Auth

- `ProtectedRoute` (in `App.tsx`) gates routes by `allowedRoles` (`USER`, `ADMIN`).
- Auth state via `useAuthStore`; `checkAuth()` runs once at app mount.
- **Onboarding gate:** if `user.profileCompleted === false`, force redirect to `/onboarding`.
- **Tokens:** cookies — `COOKIE_KEYS.ACCESS_TOKEN`, `COOKIE_KEYS.REFRESH_TOKEN` (see `utils/auth.ts`).
- **OAuth2:** Google callback handled by `OAuth2Handler` reading `?login=success&access_token=…&refresh_token=…`.
- Layout chrome (Navbar/Footer/AI sidebar) is conditionally rendered based on path prefix (`/admin`, `/dashboard`, `/canvas`, `/workspace`).

> VN: Đăng nhập Google sẽ trả token qua query string; lưu vào cookie rồi gọi `getCurrentUser`.

---

## 5. State Management

- **`useAuthStore`** — auth user, loading, `checkAuth`, `setAuth`, logout.
- **`workspaceStore`** — workspace/project/sheet metadata.
- **`canvasStore`** — React Flow nodes/edges, selection, history (zundo), persistence.

Prefer selectors (`useStore(s => s.field)`) over destructuring whole state to avoid re-renders.

---

## 6. Canvas Architecture

- `GraphCanvas` wraps React Flow with custom node/edge registries.
- Each UML element = a **custom node** under `custom-nodes/` registered in `registry.ts`.
- Each UML relationship = a **custom edge** under `edges/` registered in `edges/index.ts`.
- Property editing happens in `forms/` (one form per node type), surfaced via `PropsPanel`.
- Shape palette = `ShapePanel`. Toolbar actions = `CanvasToolbar`. Code view = `CodePanel`.
- Mermaid import: `MermaidImportDialog` → `utils/mermaid/parser.ts` → `utils/mermaid/layout.ts` → store.
- Auto-layout via `hooks/useAutoLayout.ts` (dagre).

**Adding a new node type:**
1. Component in `custom-nodes/`.
2. Register in `custom-nodes/registry.ts`.
3. Form in `forms/` and wire into `PropsPanel`.
4. Add option to `ShapePanel`.
5. Update types in `types/project.ts` (or relevant).

**Adding a new edge type:** mirror the above under `edges/`.

---

## 7. Conventions

- **Language:** code and identifiers in English; user-facing strings often Vietnamese (`Đăng nhập…`, `Đang xác thực…`). Keep new VN strings consistent with existing tone.
- **Imports:** relative paths (no path alias configured by default — check `tsconfig.json` / `vite.config` before assuming).
- **Styling:** Tailwind utility-first. Custom colors include `uml-blue`. Avoid inline styles unless dynamic.
- **Components:** functional + hooks only. PascalCase filenames matching the default export.
- **Types:** prefer explicit interfaces in `types/`. Avoid `any` — use `unknown` + narrowing.
- **HTTP:** always go through `apiClient` (handles base URL, interceptors, auth headers). Never call `axios` directly from a component.
- **Toasts:** `react-hot-toast` for user feedback on async actions.
- **Errors:** catch in services, surface to UI via toast; never swallow silently.

---

## 8. Rules for Claude (strict)

**Always:**
1. **Ask before making changes.** Read first, propose second, edit only after explicit user approval.
2. **Mirror existing patterns.** New code should look like its neighbors (file layout, naming, store shape, service shape).
3. **Prefer editing over creating.** Don't add new files when an existing one fits.
4. **Respect TypeScript strictness.** No `any` shortcuts, no `@ts-ignore` without a written reason.
5. **Route HTTP through `services/`** and `apiClient`. No raw `fetch`/`axios` in components.
6. **Keep canvas changes registry-driven.** New nodes/edges must be registered, not hardcoded.
7. **Preserve auth/onboarding gates** in `App.tsx`. Don't reorder route guards without discussion.

**Never:**
1. **No destructive git** (`reset --hard`, `push --force`, branch deletes, `--no-verify`) without explicit instruction.
2. **No accessing drives/directories outside the project** (e.g. other partitions, system folders, paths outside `D:\0.FU\SU26\UML\FE`) without first asking the user and stating exactly why access is needed. Never act against this rule.
3. **No new dependencies** without asking — discuss tradeoffs first.
3. **No new documentation files** (`*.md`, READMEs) unless the user requests them.
4. **No emojis** in code or files unless the user asks.
5. **No commits or pushes** unless the user explicitly says so.
6. **No silent refactors** during a bug fix. Fix the bug; propose cleanups separately.
7. **Don't bypass `ProtectedRoute`** or invent client-side role logic outside `useAuthStore` + route guards.
8. **Don't store auth tokens in `localStorage`** — this project uses cookies via `utils/auth.ts`.

**When uncertain:** stop and ask. One clarifying question beats one unwanted change.

> VN: Quy tắc vàng — đọc trước, hỏi sau, sửa sau cùng. Không tự ý thêm file, thêm dependency, hoặc commit khi chưa được yêu cầu.

---

## 9. CommonTasks

- **Run dev server:** `npm run dev`
- **Build:** `npm run build`
- **Preview build:** `npm run preview`
- **Add a UML node type:** see §6 "Adding a new node type".
- **Add an API call:** add a method to the relevant service in `services/`, type the response in `types/api.ts` (or domain file), consume via hook/component.
- **Add a protected page:** create in `pages/`, register inside the appropriate `<ProtectedRoute>` block in `App.tsx`.

---

## 10. Known Gotchas

- React 19 + `@xyflow/react` 12 — check peer compatibility before bumping either.
- Tailwind v4 uses the new `@tailwindcss/postcss` pipeline; config differs from v3.
- `zundo` middleware order matters when combined with `immer` — follow the existing `canvasStore` setup.
- OAuth2 tokens arrive in the URL; `OAuth2Handler` must run before any auth-gated redirect.
- Path style in this repo is Windows (`D:\0.FU\SU26\UML\FE`). Use OS-appropriate separators in scripts.

---

_Last reviewed: 2026-06-27._
