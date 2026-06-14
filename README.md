# DiaUML Studio — Drag. Connect. Document.

A web-based UML diagramming tool built with React 19, featuring 27 built-in UML/C4 templates and an interactive canvas powered by draw.io.

## Features

- **27 Built-in Templates** — 18 UML/C4 knowledge templates + 9 project-specific samples
- **Interactive Canvas** — Full draw.io editor embedded directly in the browser
- **Template Library** — Browse by category (Structural / Behavioral / C4) with grid/list view
- **Code Panels** — PlantUML, Mermaid, and XML views for every diagram
- **Dashboard** — Tab-based sidebar with persistent state
- **Responsive** — Optimized for desktop and tablet

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 6 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion 12 |
| Canvas | draw.io embed |
| State | Zustand 5 |
| Icons | Lucide React |
| HTTP | Axios |
| Notifications | React Hot Toast |

## Prerequisites

- Node.js >= 18
- npm >= 9 or yarn

## Quick Start

```bash
git clone <repo-url>
cd UML_FE
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Build

```bash
npm run build
```

Output: `dist/`

Preview the production build:

```bash
npm run preview
```

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Landing / Hero | Marketing page with features overview |
| `/pricing` | Pricing | Subscription plans with billing toggle |
| `/dashboard` | Dashboard | Project list, template library, sidebar |
| `/canvas` | Canvas Editor | Full-screen draw.io editor |
| `/templates/:id` | Template Detail | Detailed view of a specific template |
| `/admin` | Admin Dashboard | User/plan management |
| `/auth/callback` | Auth Callback | OAuth2 redirect handler |

## Architecture

### System Flow

```
User Browser
    │
    ├── Landing (`/`) ──────────► Static marketing page
    ├── Pricing (`/pricing`) ───► Subscription plans
    ├── Dashboard (`/dashboard`)─► Sidebar + Template grid
    │       │
    │       ├── Template Detail (`/templates/:id`)
    │       │       └── Draw.io embed with pre-loaded diagram.xml
    │       │
    │       └── Canvas Editor (`/canvas`)
    │               └── Draw.io embed (full-screen)
    │                   Supports: zoom, shape palette, export PNG/XML
    │
    └── Admin (`/admin`) ────────► User management panel
```

### Drawing Sequence (template → canvas)

1. User browses templates on Dashboard
2. Clicks a template → `/templates/:id`
3. Template detail page shows: purpose, best-for, requirements sections and an interactive draw.io preview with the template diagram loaded
4. Clicks "Open in Canvas" → `/canvas?template=:id`
5. Canvas page loads the same diagram in full-screen draw.io editor
6. User edits freely, adds shapes, exports

### Template Storage

All templates are static files — no backend required:

```
public/templates/
├── template-list.json              ← Master index of all 27 templates
├── lib-class-diagram/
│   ├── content.json                 ← Metadata, elements, descriptions
│   └── diagram.xml                  ← Pre-generated draw.io diagram
├── usecase-ecommerce/
│   ├── content.json
│   └── diagram.xml
└── ... (27 template directories)
```

## Template Library

| Category | Count | Examples |
|----------|-------|---------|
| **Structural** (UML) | 7 | Class, Component, Deployment, Package, Object, Composite Structure, Profile |
| **Behavioral** (UML) | 7 | Use Case, Activity, State Machine, Sequence, Communication, Interaction Overview, Timing |
| **C4 Model** | 4 | Context, Container, Component, Code |
| **Sample Templates** | 9 | E-Commerce (Use Case, Class), OAuth2 (Sequence), Order Approval (Activity), Kubernetes (Deployment), C4 for E-Commerce (4 levels) |

Each template contains:
- `content.json` — name, description, purpose, elements table, requirements, keywords
- `diagram.xml` — Pre-rendered draw.io diagram (auto-generated from `content.json`)

## Canvas (draw.io)

The current canvas is powered by draw.io embedded with minimal UI (`ui=min`):

```
URL: https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libs=general;uml
```

### Features

- **Shape Libraries**: General + UML shapes available
- **PostMessage Protocol**: Secure communication between React app and draw.io iframe
- **Export**: PNG and XML export
- **Code Panel**: PlantUML, Mermaid, and XML views

### Known Issues

1. **draw.io may fail on localhost** due to third-party cookie / storage blocking. A fallback "Open in new tab" button is shown when connectivity fails.
2. **draw.io XML ↔ React Flow JSON converter** is post-MVP. Templates use draw.io XML; the React Flow canvas (planned) will require a separate conversion layer.
3. **UML shape fidelity**: The auto-generated `diagram.xml` files render most UML elements using correct draw.io shapes (actors as stick figures, use cases as ellipses, etc.), but some edge cases (e.g., component icon positioning, sequence lifeline auto-render) are still approximate. Generated diagrams are intended as a starting point — users can refine layouts within the draw.io editor.
4. **Canvas toolbars (code panel) are stubbed** — export functions rely on draw.io's built-in export. Custom export via `html-to-image` is planned.

## Project Structure

```
.
├── public
│   ├── fonts
│   │   └── Priego-*.otf              ← Brand typography
│   ├── templates
│   │   ├── template-list.json         ← Master index of all templates
│   │   ├── lib-activity-diagram/      ← UML library templates (18)
│   │   ├── lib-c4-context/
│   │   ├── lib-c4-container/
│   │   ├── lib-c4-component/
│   │   ├── lib-c4-code/
│   │   ├── lib-class-diagram/
│   │   ├── lib-communication-diagram/
│   │   ├── lib-component-diagram/
│   │   ├── lib-composite-structure-diagram/
│   │   ├── lib-deployment-diagram/
│   │   ├── lib-interaction-overview-diagram/
│   │   ├── lib-object-diagram/
│   │   ├── lib-package-diagram/
│   │   ├── lib-profile-diagram/
│   │   ├── lib-sequence-diagram/
│   │   ├── lib-state-machine-diagram/
│   │   ├── lib-timing-diagram/
│   │   ├── lib-use-case-diagram/
│   │   ├── activity-order/            ← Sample templates (9)
│   │   ├── c4-code/
│   │   ├── c4-component/
│   │   ├── c4-container/
│   │   ├── c4-context/
│   │   ├── class-ecommerce/
│   │   ├── deployment-k8s/
│   │   ├── sequence-oauth/
│   │   └── usecase-ecommerce/
│   └── readme-pic.png                 ← Screenshot used in this README
├── scripts
│   └── gen-diagram-xml.cjs            ← Generates diagram.xml from content.json
├── src
│   ├── assets
│   │   └── images
│   ├── components
│   │   ├── Auth
│   │   │   └── AuthModal.tsx
│   │   ├── Canvas
│   │   │   ├── CanvasFrame.tsx         ← Draw.io embed with postMessage
│   │   │   ├── CanvasToolbar.tsx       ← Back, rename, code, export
│   │   │   └── CodePanel.tsx           ← PlantUML / Mermaid / XML tabs
│   │   ├── ui
│   │   │   └── LoadingOverlay.tsx
│   │   ├── CTA.tsx
│   │   ├── Features.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── Navbar.tsx
│   │   ├── Pricing.tsx
│   │   └── Templates.tsx
│   ├── pages
│   │   ├── AdminDashboard.tsx
│   │   ├── CanvasEditor.tsx           ← Reads ?template=, passes XML to CanvasFrame
│   │   ├── LandingPage.tsx
│   │   ├── Pricing.tsx
│   │   ├── TemplateDetail.tsx         ← Adaptive sections per kind, preview, open in canvas
│   │   └── UserDashboard.tsx          ← Sidebar, filter pills, grid/list toggle
│   ├── services
│   │   ├── apiClient.ts
│   │   └── authService.ts
│   ├── store
│   │   └── useAuthStore.ts
│   ├── utils
│   │   └── templates.ts              ← getTemplateList(), getTemplateContent()
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.js
```

## Screenshots

![DiaUML Studio](/readme-pic.png)

## Branch Strategy

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production — draw.io canvas only | Active |
| `phase-2` | React Flow canvas development | In progress |

Phase 2 will replace draw.io with React Flow, adding native UML node types, custom edges, shape panel, properties panel, and undo/redo.

## License

Commercial product. All third-party libraries used are MIT or Apache licensed.
