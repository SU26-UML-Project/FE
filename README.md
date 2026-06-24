# DiaUML Studio — Drag. Connect. Document.

A web-based UML diagramming tool built with React 19, featuring 27 built-in UML/C4 templates and an interactive canvas powered by React Flow.

## Features

- **27 Built-in Templates** — 18 UML/C4 knowledge templates + 9 project-specific samples
- **Interactive Canvas** — Full UML editor powered by React Flow with custom nodes and edges
- **Auto Layout** — Intelligent diagram arrangement using Dagre engine
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
| Canvas | React Flow (@xyflow/react) |
| Layout | Dagre |
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
| `/canvas` | Canvas Editor | UML editor with custom nodes |
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
    │       │       └── React Flow preview with custom nodes
    │       │
    │       └── Canvas Editor (`/canvas`)
    │               └── Full-screen React Flow editor
    │                   Supports: drag-n-drop, custom edges, auto-layout
    │
    └── Admin (`/admin`) ────────► User management panel
```

### Drawing Sequence (template → canvas)

1. User browses templates on Dashboard
2. Clicks a template → `/templates/:id`
3. Template detail page shows: purpose, best-for, requirements sections and an interactive React Flow preview with the template diagram loaded
4. Clicks "Open in Canvas" → `/canvas?template=:id`
5. Canvas page loads the same diagram in full-screen React Flow editor
6. User edits freely, adds shapes, auto-layout, exports

### Template Storage

All templates are static files — no backend required:

```
public/templates/
├── template-list.json              ← Master index of all 27 templates
├── lib-class-diagram/
│   └── content.json                 ← Metadata, elements, descriptions, nodes, edges
├── usecase-ecommerce/
│   └── content.json
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
- `content.json` — name, description, purpose, elements table, requirements, keywords, and graph data (nodes/edges)

## Canvas (React Flow)

The current canvas is powered by React Flow with custom node types:

- **ClassNode**: UML Class with attributes and methods
- **InterfaceNode**: UML Interface with methods
- **UseCaseNode**: UML Use Case ellipse
- **ActorNode**: UML Actor stick figure

### Features
- **Auto Layout**: Powered by Dagre for automatic positioning
- **Custom Edges**: Association, Inheritance, Realization, Composition, Aggregation, Dependency, Include, Extend
- **Lock Mechanism**: Canvas is locked during AI processing to maintain state integrity
- **Properties Panel**: Contextual editing of node/edge data
- **Undo/Redo**: Full history support via Zundo

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
| `main` | Production — React Flow canvas | Active |

## License

Commercial product. All third-party libraries used are MIT or Apache licensed.
