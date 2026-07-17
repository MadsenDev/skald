# ForgeNote: a multiplayer, schema-aware Obsidian alternative

## Core idea

Keep Obsidian’s strengths (local-first Markdown, plugins, graph view), but fix its weak spots: real-time collaboration, structured data, reliable sync, and safer plugins. ForgeNote is a local-first knowledge base with CRDT sync, task & project primitives, type-safe metadata, and an actually secure plugin sandbox.

---

## What’s improved (at a glance)

* **True multiplayer**: Live co-editing via CRDTs (Yjs or Automerge) with conflict-free merges and presence cursors. Works peer-to-peer on LAN, or via an optional relay.
* **Typed frontmatter**: Define collections/schemas (Zod) for notes, tasks, bookmarks, docs. The app validates frontmatter on save + offers typed forms instead of raw YAML.
* **Tasks as first-class**: Inline `- [ ]` tasks are auto-extracted into a global task model with status, priority, due, and relations to notes.
* **Encrypted sync**: E2E by default using a vault key. Relays only see ciphertext. Local search indexes encrypt at rest.
* **Plugin sandbox**: Plugins run in a locked-down VM (isolated context / WASM) with a declarative capability manifest (FS read/write to whitelisted paths, network off by default).
* **Fast search**: Incremental indexing to Meilisearch-lite (embedded) or Tantivy/WASM. Queries filter by type, tag, schema fields.
* **Canvas & graph done right**: Canvas nodes can be notes, tasks, or queries; graph filters by schema/entity relationships, not only links.
* **Project views**: Saved queries as kanban, calendar, table, or graph. All powered by the same typed metadata.
* **Performance**: Background indexing with worker threads; deferred graph layout; window-level code splitting; GPU-safe toggles for low-end machines.

---

## Target stack

**Desktop shell**

* Electron 31+, Context-Isolation on, `@electron/remote` avoided.
* Auto-updates via differential packages.

**Frontend**

* Vite + React + Tailwind 3.4.x + Framer Motion + react-icons.
* State: Zustand for UI, Yjs docs for content.
* Monaco editor for code/markdown; Lexical for rich blocks.

**Local engine**

* CRDT: Yjs (documents per note + subdocs for tasks).
* Storage: SQLite (via Drizzle ORM) for metadata + binary blobs; vault files on disk.
* Search: Tantivy-WASM or Meilisearch embedded (opt-in).
* Encryption: libsodium (XChaCha20-Poly1305 for content, Argon2id for key derivation).
* File system: chokidar watcher with backpressure + journaled writes.

**Optional relay (self-hostable)**

* Express + ws (WebSocket) for awareness + doc updates.
* Sequelize + MySQL (or Postgres) for user/org/room metadata.
* Object storage (S3-compatible) for large attachments (encrypted client-side).

---

## Data model sketch

**Notes (Markdown + frontmatter)**

* `id, path, title, ydoc_id, schema_id?, updated_at, created_at`
* Frontmatter validated against a **Schema**: `id, name, zod_json`

**Tasks (extracted from notes)**

* `id, note_id, line_anchor, status(enum), priority, due_date, assigned_to, labels[]`

**Relations**

* `backlinks(note_id → note_id)`, `entities(schema_id)` for typed collections (e.g., “People”, “Projects”).

---

## Plugin system (secure by design)

* **Manifest**: declares capabilities (`fs.read:/vault/notes`, `index.query`, `ui.panel`, `commands`).
* **Runtime**: Runs in isolated VM or WASM; no Node or Electron globals.
* **IPC bridge**: Capability-scoped RPC; requests are audited and user-approvable.
* **UI**: Plugins render via a sandboxed iframe/Shadow DOM with a small UI SDK.

**Example manifest**

```json
{
  "name": "frontmatter-linter",
  "version": "1.0.0",
  "capabilities": {
    "fs": { "read": ["/vault/notes"], "write": [] },
    "index": ["query"],
    "commands": ["lint:current-note"]
  }
}
```

---

## Key workflows

### 1) Real-time editing + offline

* Each note is a Yjs document stored to disk and mirrored to SQLite for metadata.
* Awareness pings via WebSocket; if offline, edits queue in CRDT and merge later.
* Attachments chunked, encrypted, and synced separately.

### 2) Typed frontmatter UX

* When a note uses `schema: Project`, the frontmatter panel shows typed fields with validation.
* The editor offers autocomplete for fields and tags; invalid saves are blocked (or allowed with warnings depending on workspace policy).

### 3) Tasks everywhere

* Inline tasks are parsed to a normalized table.
* Global Task views (table/kanban/calendar) run on the same data, not brittle regexes.
* Bidirectional links keep tasks in context with their parent notes.

### 4) Search that respects structure

* Query language: `type:task status:open tag:research due<2025-12-01 "vector db"`
* Index includes: headings, code blocks, backlinks, schema fields, and attachment text (via Tesseract/WASM for images, optional).

---

## Electron hardening & performance

* Context isolation, CSP, and `ipcMain.handle` with explicit, typed channels.
* No `eval`, no `nodeIntegration` in renderer.
* Heavy work (indexing, OCR) in isolated Node worker threads.
* Lazy-load graph/canvas. Debounce FS events; batch reindexing.
* Multi-process aware: single Instance Lock + URIs (`forgenote://open?path=…`).

---

## Implementation plan (6 sprints)

1. **Vault core**: FS watcher, SQLite catalog, Markdown editor, basic Yjs local doc.
2. **Schema engine**: Zod-driven frontmatter, typed forms, validation pipeline.
3. **Tasks**: extractor, global views (table/kanban/calendar), quick-capture.
4. **Search**: incremental indexer, query language, results UI.
5. **Sync & encryption**: E2E vault key, relay, presence cursors, conflict tests.
6. **Plugins + canvas/graph**: sandbox runtime, capability prompts, visual canvas.

---

## Differentiators vs. Obsidian

* **Real E2E multiplayer** without third-party cloud reliance.
* **Typed content**: safer automations and reliable refactors.
* **Security model**: capability-gated plugins instead of full Node access.
* **Unified data layer**: tasks, notes, entities all queryable and linkable.

---

## Dev ergonomics (because we’ll live here)

* Hot-reload Electron + Vite.
* Type-safe IPC using `ts-rpc` style codegen.
* Test harness spinning headless Electron to run plugin integration tests.
* Workspace export/import with deterministic IDs for VCS friendliness.

---

## Tiny code teasers

**Typed IPC channel**

```ts
// preload.ts
import { contextBridge, ipcRenderer } from "electron";

type Channels = {
  "index.search": (q: string) => Promise<SearchResult[]>;
  "vault.readFile": (path: string) => Promise<ArrayBuffer>;
};

contextBridge.exposeInMainWorld("api", {
  search: (q: string) => ipcRenderer.invoke("index.search", q),
  readFile: (p: string) => ipcRenderer.invoke("vault.readFile", p)
} satisfies Record<string, (...a: any[]) => any>);
```

**Zod schema for a Project**

```ts
import { z } from "zod";

export const Project = z.object({
  schema: z.literal("Project"),
  title: z.string().min(1),
  status: z.enum(["planned", "active", "paused", "done"]),
  due: z.string().datetime().optional(),
  tags: z.array(z.string()).default([])
});
```

---

## Stretch ideas

* Local LLM “assist” that operates on the encrypted vault (RAG, summaries) fully offline.
* Two-way sync with Git (commit per stable snapshot, not every keystroke).
* Mobile companion (React Native) with the same CRDT/doc model.