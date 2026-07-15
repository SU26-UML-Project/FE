# Backend handoff: Project workspace file tree

## 1. Product change

A project is changing from a flat collection of diagram sheets into an Obsidian-like workspace. Each project can contain nested folders and independent files.

Supported item kinds:

- `FOLDER`: organization only.
- `MARKDOWN`: free-form project documentation.
- `DIAGRAM`: a UML/C4 diagram. During migration it should reference the existing sheet record rather than duplicate `diagramData`.

The frontend currently provides a compatibility prototype: existing backend sheets remain the source of truth for diagrams, while tree metadata and Markdown are stored in localStorage. Backend support is required before this feature is production-ready or available across devices/users.

## 2. Required behavior

- List all workspace items belonging to a project.
- Create nested folders, Markdown files, and diagram files.
- Rename, move, reorder, duplicate, and recursively delete items.
- Persist Markdown content.
- Preserve existing sheet canvas APIs and collaboration behavior.
- Return a stable tree to every authorized collaborator.
- Prevent cycles and cross-project parent references.
- Keep diagram type fixed after a non-empty diagram is created.

## 3. Recommended data model

### `workspace_items`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `project_id` | UUID | Required; FK to project |
| `parent_id` | UUID nullable | FK to `workspace_items.id`; folder only |
| `name` | varchar | Required, trimmed |
| `kind` | enum | `FOLDER`, `MARKDOWN`, `DIAGRAM` |
| `order_index` | integer | Required, non-negative |
| `sheet_id` | UUID nullable | Required only for `DIAGRAM`; unique FK to existing sheet |
| `markdown_content` | text nullable | Allowed only for `MARKDOWN` |
| `version` | bigint | Optimistic concurrency counter |
| `created_by` | UUID | Audit field |
| `created_at` | timestamp | Server-generated |
| `updated_at` | timestamp | Server-generated |
| `deleted_at` | timestamp nullable | Optional soft-delete support |

Recommended constraints:

```text
kind = FOLDER   -> sheet_id IS NULL AND markdown_content IS NULL
kind = MARKDOWN -> sheet_id IS NULL
kind = DIAGRAM  -> sheet_id IS NOT NULL AND markdown_content IS NULL
parent_id       -> referenced item belongs to same project and is FOLDER
UNIQUE(project_id, parent_id, normalized_name, deleted_at-active)
UNIQUE(sheet_id) WHERE sheet_id IS NOT NULL
```

Keep diagram content in the existing `sheets.diagram_data` field for now. This minimizes migration risk and preserves canvas collaboration/autosave APIs.

If Markdown becomes large or needs version history, split it later into `workspace_markdown_contents(item_id, content, version, updated_at)` without changing the tree contract.

## 4. API contract

All endpoints require the same project authorization used by the current project/sheet APIs.

### List workspace

```http
GET /projects/{projectId}/workspace-items
```

Return a flat list. The frontend builds the tree; a flat response makes moving and incremental updates simpler.

```json
{
  "code": 200,
  "result": {
    "items": [
      {
        "id": "uuid",
        "projectId": "uuid",
        "parentId": null,
        "name": "Requirements",
        "kind": "FOLDER",
        "orderIndex": 0,
        "sheetId": null,
        "diagramType": null,
        "content": null,
        "version": 3,
        "createdAt": "2026-07-15T10:00:00Z",
        "updatedAt": "2026-07-15T10:00:00Z"
      }
    ]
  }
}
```

`diagramType` may be joined from the sheet's `diagramData`, but preferably becomes an indexed sheet column during migration.

### Create folder or Markdown file

```http
POST /projects/{projectId}/workspace-items
```

```json
{
  "parentId": null,
  "name": "README.md",
  "kind": "MARKDOWN",
  "content": "",
  "orderIndex": 0
}
```

For a folder, omit `content`.

### Create diagram atomically

Preferred endpoint:

```http
POST /projects/{projectId}/diagrams
```

```json
{
  "parentId": "folder-uuid-or-null",
  "name": "Checkout Sequence",
  "diagramType": "sequence",
  "orderIndex": 0,
  "diagramData": {
    "nodes": [],
    "edges": [],
    "diagramType": "sequence",
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  }
}
```

The backend must create the sheet and its `DIAGRAM` workspace item in one transaction. Do not require the client to issue two independent create requests; that can leave orphan sheets/items.

### Update metadata/content

```http
PATCH /workspace-items/{itemId}
```

```json
{
  "name": "Architecture.md",
  "content": "# Architecture",
  "expectedVersion": 4
}
```

Only supplied fields are changed. Reject `content` for non-Markdown items.

For frequent Markdown autosave, a focused endpoint is also acceptable:

```http
PUT /workspace-items/{itemId}/content
```

```json
{
  "content": "# Architecture",
  "expectedVersion": 4
}
```

Return the new `version` and `updatedAt`.

### Move/reorder

```http
PATCH /workspace-items/{itemId}/position
```

```json
{
  "parentId": "target-folder-uuid-or-null",
  "orderIndex": 2,
  "expectedVersion": 4
}
```

The backend should normalize sibling order indexes in one transaction.

### Duplicate

```http
POST /workspace-items/{itemId}/duplicate
```

```json
{
  "parentId": "target-folder-uuid-or-null",
  "name": "Architecture copy.md"
}
```

- Markdown: copy content.
- Diagram: create a new sheet and copy sanitized diagram data.
- Folder: either recursively duplicate atomically or explicitly reject until recursive duplication is supported.

### Delete

```http
DELETE /workspace-items/{itemId}?recursive=true
```

For a diagram, delete/soft-delete its linked sheet in the same transaction. For a folder, return `409 FOLDER_NOT_EMPTY` unless `recursive=true`. Recursive deletion must be atomic.

## 5. Validation and security

- Verify item, parent, sheet, and project all belong to the same project.
- Parent must be a folder.
- Reject moving a folder into itself or any descendant (`409 TREE_CYCLE`).
- Define case sensitivity for sibling names. Recommended: trim names and enforce case-insensitive uniqueness per parent.
- Maximum name length: 255 characters.
- Maximum depth: no hard product limit is required, but reject pathological trees above a safe server limit such as 50.
- Limit Markdown payload size (for example 2 MB) and return `413` when exceeded.
- Markdown must be treated as untrusted text. Frontend rendering must not enable raw HTML unless sanitized.
- Apply project owner/member permissions consistently to tree and sheet endpoints.
- Do not trust client-provided `projectId`, `createdBy`, timestamps, or version.

Suggested error codes:

```text
ITEM_NOT_FOUND
PARENT_NOT_FOUND
PARENT_NOT_FOLDER
DUPLICATE_NAME
TREE_CYCLE
FOLDER_NOT_EMPTY
VERSION_CONFLICT
DIAGRAM_TYPE_LOCKED
PROJECT_ACCESS_DENIED
```

## 6. Concurrency

Use optimistic concurrency through `version`/ETag.

- Client sends `expectedVersion` or `If-Match`.
- Backend returns `409 VERSION_CONFLICT` when stale.
- For Markdown, return current server content/version so the UI can offer reload or conflict resolution.
- Tree mutations should publish a websocket event to existing project collaborators after commit.

Suggested events:

```text
workspace:item-created
workspace:item-updated
workspace:item-moved
workspace:item-deleted
```

Do not broadcast before the database transaction commits.

## 7. Migration from existing sheets

Recommended migration:

1. Create `workspace_items` table and indexes.
2. For every existing sheet, create one root-level `DIAGRAM` item.
3. Use the current sheet name as item name.
4. Resolve duplicate names by deterministic suffix (`Name (2)`, `Name (3)`).
5. Preserve sheet IDs and diagram data; do not recreate canvas records.
6. Derive `diagramType` from existing JSON, falling back to `activity` only when absent/invalid.
7. Verify every active sheet has exactly one diagram item.
8. Deploy read APIs.
9. Switch frontend from local adapter to API adapter.
10. Deploy mutation APIs, then remove localStorage compatibility after one stable release.

Migration should be idempotent. A unique index on `sheet_id` prevents duplicate diagram items on reruns.

## 8. Compatibility requirements

Until all clients migrate:

- Keep current `/sheets/project/{projectId}` and sheet CRUD endpoints working.
- A sheet created by an old client should automatically receive a root diagram item, ideally in the same service transaction.
- Deleting a sheet through the old endpoint must also remove/soft-delete its workspace item.
- Renaming a sheet and renaming its diagram item must remain synchronized. Choose one canonical name and enforce it server-side.

The preferred long-term flow is workspace-item APIs for navigation and existing sheet APIs for canvas content/autosave.

## 9. Backend implementation order

1. Schema, constraints, migration, list endpoint.
2. Folder and Markdown CRUD.
3. Atomic diagram creation and sheet compatibility hooks.
4. Move/reorder with cycle prevention.
5. Recursive delete and duplicate.
6. Optimistic concurrency.
7. Websocket events and collaborative tree refresh.
8. Integration tests and permission tests.

## 10. Minimum integration test matrix

- Create root/nested folder.
- Create Markdown and preserve empty content.
- Create diagram and linked sheet atomically.
- Reject duplicate sibling name.
- Allow identical names in different folders.
- Reject file as parent.
- Reject cross-project parent/sheet.
- Reject self/descendant move.
- Reorder siblings without duplicate/gapped indexes after normalization.
- Delete non-empty folder with and without `recursive=true`.
- Concurrent Markdown update returns conflict.
- Old sheet API creation/deletion stays synchronized.
- Unauthorized user cannot list or mutate workspace items.
- Migration rerun creates no duplicate diagram items.
