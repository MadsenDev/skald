# ForgeNote Feature Roadmap

This document tracks planned features and their implementation status.

## 🎯 Current Sprint: Note Refactoring Tools

**Status**: ✅ Completed  
**Priority**: High  
**Estimated Complexity**: Medium

### Feature: Quick Switcher v2

Global fuzzy search with previews (`Ctrl/Cmd + P`):
- Search across notes, headings, tasks
- Weighted relevance (recent + title match > content match)
- Modal command palette with preview pane
- Keyboard navigation (arrow keys, enter, escape)

**Implementation**:
- ✅ Created `QuickSwitcher` component with modal overlay
- ✅ Implemented fuzzy search with weighted relevance scoring
- ✅ Added preview pane showing selected result content
- ✅ Added keyboard navigation (arrow keys, enter, escape)
- ✅ Added global keyboard shortcut (Ctrl/Cmd + P and Ctrl/Cmd + K)
- ✅ Made QuickSwitcher theme-aware
- ✅ Added IPC endpoint `search:getAll` for fetching all documents

**Files Created/Modified**:
- `src/components/QuickSwitcher.tsx` (new)
- `src/App.tsx` (modified - added QuickSwitcher integration)
- `src-main/main.ts` (modified - added `search:getAll` IPC handler)
- `src-main/preload.ts` (modified - added `search:getAll` to API)

---

## 📋 Feature Backlog

### High Priority

#### 1. Quick Switcher v2
**Status**: Planned  
**Priority**: High  
**Complexity**: Medium

Global fuzzy search with previews (`Ctrl/Cmd + P`):
- Search across notes, headings, tasks
- Weighted relevance (recent + title match > content match)
- Modal command palette with preview pane

**Dependencies**: Existing search index

---

#### 2. Daily Notes Dashboard
**Status**: ✅ Completed  
**Priority**: High  
**Complexity**: Low-Medium

Homepage showing:
- Today's tasks (due or overdue)
- Recently modified notes
- Calendar for next 7 days
- Linked notes

**Implementation**:
- ✅ Created `DailyNotesDashboard` component
- ✅ Integrated into `App.tsx` to show when no note is selected
- ✅ Added `onClose` prop to `NoteEditor` to return to dashboard
- ✅ Made task tags theme-aware with proper contrast

**Files Created/Modified**:
- `src/components/DailyNotesDashboard.tsx` (new)
- `src/components/NoteEditor.tsx` (modified - added onClose)
- `src/App.tsx` (modified - integrated dashboard)

---

#### 3. Note Refactoring Tools
**Status**: ✅ Completed  
**Priority**: High  
**Complexity**: Medium

Centralized tools for safe note modifications:
- Rename note (update all wikilinks)
- Move note (update paths)
- Extract selection to new note

**Implementation**:
- ✅ Created `RefactorNoteModal` component with rename, move, and extract modes
- ✅ Added refactoring backend functions (`renameNote`, `moveNoteWithWikilinkUpdate`, `extractSelectionToNote`)
- ✅ Integrated refactor button in `NoteEditor` header
- ✅ Added refactor options to sidebar context menu
- ✅ Updated drag-and-drop to use refactor move (updates wikilinks)
- ✅ All operations automatically update wikilinks across the vault

**Files Created/Modified**:
- `src/components/RefactorNoteModal.tsx` (new)
- `src-main/vault/refactor.ts` (new)
- `src/components/NoteEditor.tsx` (modified - added refactor button)
- `src/components/FolderTree.tsx` (modified - added context menu options and drag-and-drop)
- `src-main/main.ts` (modified - added IPC handlers)
- `src-main/preload.ts` (modified - exposed refactor API)

---

### Medium Priority

#### 4. Embeds v2 (Editable In-Place Notes)
**Status**: Planned  
**Priority**: Medium  
**Complexity**: Medium-High

Support `![[Note]]` embeds that are editable inline:
- Load note content in preview
- Render editor (Monaco small instance)
- Prevent infinite embedding loops
- Changes propagate to main editor

**Dependencies**: Markdown renderer, Monaco Editor

---

#### 5. Automatic Link Suggestions While Typing
**Status**: Planned  
**Priority**: Medium  
**Complexity**: Medium

Suggest linking to existing notes while typing:
- Semantic search on last 3-5 words
- Inline suggestion: "Link to **X**?"
- Accept with Tab/Enter

**Dependencies**: Search engine, Monaco Editor

---

### Lower Priority (Future)

#### 6. Local Knowledge Graph v2
**Status**: Planned  
**Priority**: Low  
**Complexity**: High

Graph view using wikilinks, backlinks, schemas, task relationships:
- Render with d3-force or Cytoscape.js
- Nodes: Note, Task, Schema Entity
- Edges: wikilink, backlink, frontmatter relations, task-ref

**Dependencies**: d3-force or Cytoscape.js, graph data structure

---

#### 7. Schema-Driven Views (Notion-like)
**Status**: Planned  
**Priority**: Low  
**Complexity**: High

Each schema gets automatic views:
- Views defined in `.vault/views.json`
- Types: table, kanban, calendar, list
- New sidebar tab: "Views"

**Dependencies**: Schema system, view system architecture

---

#### 8. Canvas v2 (Better Obsidian Canvas)
**Status**: Planned  
**Priority**: Low  
**Complexity**: Very High

Interactive whiteboard with typed nodes:
- Node types: Note, Task, Image, Text
- Pan/zoom
- Auto layout options
- Drag to link nodes
- Store in `<vault>/.vault/canvas/*.json`

**Dependencies**: Canvas library (fabric.js, konva.js, or custom)

---

#### 9. Local AI Assistant
**Status**: Planned  
**Priority**: Low  
**Complexity**: High

AI actions (local or external API):
- Tools: `summarizeNote`, `generateTasksFromText`, `rewriteSelection`
- AI panel on right side

**Dependencies**: LLM integration (local or API)

---

#### 10. Vault-Level Settings Sync
**Status**: Planned  
**Priority**: Low  
**Complexity**: Low

Store settings in vault instead of system-level:
- Move from `app-data/settings.json`
- New file: `<vault>/.vault/settings.json`
- Load on vault open

**Dependencies**: Settings system

---

#### 11. Plugin System (Safe Sandbox)
**Status**: Planned  
**Priority**: Low  
**Complexity**: Very High

Plugins run in isolated VMs:
- Plugin manifest with permissions
- Execution in VM2 or WASM
- Only expose declared APIs
- Auto-load from `/plugins` folder

**Dependencies**: VM2/WASM, security model

---

## ✅ Completed Features

- ✅ Vault core (FS watcher, Markdown editor)
- ✅ Schema engine (Zod-driven frontmatter)
- ✅ Tasks (extractor, table/kanban/calendar views)
- ✅ Search (incremental indexer, query language)
- ✅ Wikilinks (parsing, rendering, autocomplete)
- ✅ Backlinks (extraction, display panel)
- ✅ Folder organization (drag-and-drop)
- ✅ Multi-theme system
- ✅ Custom titlebar
- ✅ Auto-save
- ✅ Code block syntax highlighting
- ✅ Hover Previews (wikilink previews on hover)
- ✅ Quick Switcher v2 (global fuzzy search with previews)
- ✅ Daily Notes Dashboard (homepage with tasks, recent notes, calendar)
- ✅ Note Refactoring Tools (rename, move, extract with wikilink updates)
- ✅ Sidebar note display setting (filename vs title)

---

## 📝 Notes

- Features are implemented in priority order
- Each feature should be fully tested before moving to next
- Keep this file updated as features are completed
- Mark features as "In Progress" when starting work

