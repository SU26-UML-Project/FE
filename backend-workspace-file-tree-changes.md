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

## 11. Diagram version history (new requirement)

The frontend now includes a local-only diagram version history prototype. Production must move this data to the backend so versions are shared, auditable, and safe during collaboration.

### Recommended table: `diagram_versions`

```text
id UUID PK
sheet_id UUID NOT NULL FK sheets(id)
version_number BIGINT NOT NULL
name VARCHAR(255) NOT NULL
note TEXT NULL
source ENUM(AUTO, MANUAL, BEFORE_AI, BEFORE_IMPORT, BEFORE_RESTORE, RESTORE)
diagram_data JSON/JSONB NOT NULL
content_hash VARCHAR(128) NOT NULL
schema_version INT NOT NULL
created_by UUID NOT NULL
created_at TIMESTAMP NOT NULL
restored_from_version_id UUID NULL FK diagram_versions(id)
UNIQUE(sheet_id, version_number)
```

Do not version temporary UI state (`selected`, remote cursors, inspector state, undo stack). Store diagram type, normalized nodes/edges, optional viewport, and schema version.

### Required endpoints

```http
GET  /sheets/{sheetId}/versions
GET  /sheets/{sheetId}/versions/{versionId}
POST /sheets/{sheetId}/versions
GET  /sheets/{sheetId}/versions/{versionId}/compare?target=current&includePosition=false
POST /sheets/{sheetId}/versions/{versionId}/restore
```

Create request:

```json
{
  "name": "Before payment refactor",
  "note": "Stable checkout workflow",
  "source": "MANUAL",
  "diagramData": {
    "schemaVersion": 1,
    "diagramType": "sequence",
    "nodes": [],
    "edges": [],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "expectedSheetVersion": 24
}
```

### Restore transaction

Restore must never delete later history or mutate the selected historical row. In one database transaction:

1. Authorize write access and lock/check the current sheet version.
2. Create a `BEFORE_RESTORE` snapshot of current content.
3. Validate/migrate the selected snapshot schema.
4. Replace current sheet diagram data.
5. Create a new `RESTORE` version referencing `restored_from_version_id`.
6. Increment the sheet optimistic version.
7. Commit, then broadcast the restored canvas to collaborators.

Return `409 VERSION_CONFLICT` when current sheet content changed after the review started. Never broadcast before commit.

### Snapshot policy

- Manual checkpoint on user request.
- Auto checkpoint at a bounded interval only when content hash changed.
- Checkpoint before AI apply, import, clear, and restore.
- Deduplicate by normalized content hash.
- Position changes should be optional in compare results and should not create noisy versions by themselves unless product policy explicitly enables it.
- Apply retention to AUTO versions only; preserve MANUAL and restore-related audit versions.

### Compare response

Return stable-ID changes grouped as:

```json
{
  "addedNodes": [],
  "removedNodes": [],
  "changedNodes": [{ "id": "n1", "fields": ["data"] }],
  "addedEdges": [],
  "removedEdges": [],
  "changedEdges": []
}
```

The backend must validate edges against snapshot node IDs, reject corrupt snapshots, cap snapshot size, and support schema migration for old versions.

## 12. AI context attachments, workspace mentions, and uploads

The frontend AI composer now supports workspace drag/drop, `#` mentions, context chips, pinned context, and external file selection. Text-like external files are read inline only as a temporary prototype. PDF/DOCX and production use require backend upload/extraction APIs.

### Chat request contract

Extend `POST /diagram-ai/chat`:

```json
{
  "message": "Compare the requirement with the current use case",
  "sessionId": "session-uuid",
  "sheetId": "active-sheet-uuid",
  "currentNodes": [],
  "currentEdges": [],
  "contexts": [
    {
      "type": "WORKSPACE_MARKDOWN",
      "itemId": "workspace-item-uuid",
      "name": "requirements.md"
    },
    {
      "type": "DIAGRAM",
      "itemId": "workspace-item-uuid",
      "sheetId": "sheet-uuid",
      "name": "Checkout Use Case",
      "versionId": null
    },
    {
      "type": "UPLOADED_FILE",
      "fileId": "ai-file-uuid",
      "name": "specification.docx"
    }
  ]
}
```

Do not trust client-provided inline workspace content in production. Resolve `itemId`, `sheetId`, and `versionId` server-side after authorization. During the compatibility period the frontend may send `inlineContent` for local-only Markdown/text files; cap and sanitize it, and mark responses as using unsynced local context.

### Context types

```text
WORKSPACE_MARKDOWN
DIAGRAM
UPLOADED_FILE
CANVAS_SELECTION   (next phase)
PROJECT_RETRIEVAL  (next phase; RAG, never dump entire project)
```

For `DIAGRAM`, use structured nodes/edges rather than image OCR. If `versionId` is present, resolve that immutable diagram version. Otherwise snapshot current sheet data at request start so the answer is reproducible.

### AI file APIs

```http
POST   /ai/files                    multipart/form-data
GET    /ai/files/{fileId}
GET    /ai/files/{fileId}/status
DELETE /ai/files/{fileId}
GET    /projects/{projectId}/ai-files
```

Upload response:

```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "specification.docx",
  "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size": 428104,
  "status": "PROCESSING",
  "createdAt": "2026-07-16T10:00:00Z"
}
```

Status values:

```text
UPLOADING
PROCESSING
READY
FAILED
QUARANTINED
DELETED
```

Processing pipeline:

1. Stream upload to private object storage; never make AI files public.
2. Verify declared MIME against file signature.
3. Enforce per-file, per-message, user, and project quotas.
4. Malware scan and quarantine failures.
5. Extract text and metadata (PDF pages, DOCX headings, CSV rows, source paths).
6. Normalize encoding; reject encrypted/password-protected documents with a clear error.
7. Chunk with stable chunk IDs and source-location metadata.
8. Generate embeddings asynchronously if RAG is enabled.
9. Mark `READY` only after extraction/indexing is complete.
10. Publish processing status over websocket or support polling.

Initial limits recommended:

```text
10 attachments per chat message
20 MB per file
100 MB total temporary AI files per user
2 MB maximum inline text payload
configurable extracted-token ceiling per file/project
```

### Retrieval and token budgeting

Never concatenate every attached folder/project file blindly. Build a context manifest, then retrieve relevant chunks based on the user query.

Recommended priority:

1. Explicitly attached item/version.
2. Current canvas and selected elements.
3. Pinned conversation context.
4. Project retrieval only when explicitly requested.

Return a preflight estimate or include usage metadata:

```json
{
  "contextUsage": {
    "itemsRequested": 5,
    "itemsUsed": 4,
    "estimatedTokens": 12480,
    "omitted": [{ "id": "...", "reason": "TOKEN_BUDGET" }]
  }
}
```

If budget is exceeded, do not silently truncate arbitrary sources. Return a structured warning so the UI can ask the user to remove files or allow retrieval mode.

### Source citations

AI responses should return structured citations:

```json
{
  "answer": "...",
  "sources": [
    {
      "contextType": "WORKSPACE_MARKDOWN",
      "itemId": "uuid",
      "name": "requirements.md",
      "heading": "Payment rules",
      "lineStart": 42,
      "lineEnd": 58,
      "chunkId": "uuid"
    },
    {
      "contextType": "DIAGRAM",
      "sheetId": "uuid",
      "versionId": "uuid-or-null",
      "nodeIds": ["payment-service", "checkout"]
    },
    {
      "contextType": "UPLOADED_FILE",
      "fileId": "uuid",
      "page": 12,
      "chunkId": "uuid"
    }
  ]
}
```

The frontend can then open the correct workspace tab, focus diagram nodes, navigate to a Markdown heading, or open a document page.

### Authorization and isolation

For every context independently:

- Verify authenticated user can read the project/item/sheet/version/file.
- Reject cross-project references unless an explicit sharing model permits them.
- Never use client name/path as authorization evidence.
- Store uploader, project, retention, and audit metadata.
- Prevent one chat session from retaining access after project membership is revoked.
- Re-check permissions when replaying chat history or pinned contexts.

### Conversation persistence

Persist context references with each user message, not only at session level. A pinned chip means the frontend repeats that reference on later requests; backend should still record the exact per-message manifest used for audit/reproducibility.

Suggested tables:

```text
ai_files
ai_file_chunks
chat_message_contexts
ai_context_usage
```

`chat_message_contexts` should include message ID, context type/reference ID, resolved version/hash, token count, and retrieval status.

### Folder behavior

A folder drop is a selection request, not permission to ingest an unlimited subtree. Backend should expose an estimate endpoint if folder context is supported:

```http
POST /projects/{projectId}/ai-context/estimate
```

```json
{
  "itemIds": ["folder-uuid"],
  "recursive": true
}
```

Return file count, supported/unsupported count, estimated tokens, and oversized items. The current frontend prototype limits folder expansion to the first 10 supported workspace files.

### Failure codes

```text
AI_FILE_TOO_LARGE
AI_FILE_TYPE_UNSUPPORTED
AI_FILE_PROCESSING
AI_FILE_EXTRACTION_FAILED
AI_FILE_QUARANTINED
AI_CONTEXT_ACCESS_DENIED
AI_CONTEXT_NOT_FOUND
AI_CONTEXT_TOKEN_LIMIT
AI_CONTEXT_VERSION_CONFLICT
AI_CONTEXT_SCHEMA_UNSUPPORTED
```

### Backend implementation order

1. Accept typed `contexts` in chat DTO and authorize workspace references.
2. Resolve backend Markdown and diagram snapshots; include exact version/hash in message audit.
3. Implement private upload/status/delete APIs.
4. Add PDF/DOCX/text extraction and quotas.
5. Add chunking/embeddings and token-budget retrieval.
6. Return structured citations and usage/omission metadata.
7. Add websocket processing updates, retention cleanup, and audit/admin visibility.

### Required tests

- User cannot attach an item from another inaccessible project.
- Renaming a file does not break ID-based context resolution.
- Diagram current/version context resolves deterministically.
- Oversized/unsupported/encrypted/malicious files fail with correct status.
- Sending while a file is `PROCESSING` is rejected clearly.
- Token overflow returns omissions instead of silent truncation.
- Folder recursion prevents cycles and respects limits.
- Deleted/revoked files cannot be reused from old chat sessions.
- Citations point to valid item/version/chunk/page/node IDs.
- Concurrent sheet edits do not alter the snapshot already used by an in-flight AI request.
