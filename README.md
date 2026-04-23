# Skald

Skald is an Electron desktop knowledge-base app aimed at a local-first, schema-aware note workflow with room for future collaboration features.

The product direction in the planning docs often uses the name `ForgeNote`: an Obsidian-like vault with stronger structured data, task extraction, search, and eventually safer collaboration and plugin boundaries. The repository name remains `skald`.

## Current scope

The app already contains working foundations for:

- vault selection and vault loading
- note list and note editor flows
- markdown editing and preview tooling
- task views in table, kanban, and calendar form
- quick switcher and search flows
- daily notes dashboard
- quick capture flows
- theme loading, theme studio, and animated backgrounds
- Electron shell with preload bridge

## Tech stack

- Electron
- React
- Vite
- TypeScript
- Lexical
- Monaco Editor
- Yjs
- Zustand
- Tailwind CSS

## Development

```bash
npm install
npm run electron:dev
```

Useful commands:

```bash
npm run build
npm run typecheck
npm run electron:pack
```

## Project structure

- `src/App.tsx`: application shell
- `src/components/`: vault, notes, editor, tasks, quick capture, search, and theme UI
- `src/store/`: vault, task, schema, search, settings, and pinned-preview state
- `src/themes/`: theme system, loading, and application
- `src/utils/`: wikilinks, frontmatter, schema parsing, task formatting, and editor helpers

## Planning docs

Read these before making major product or architecture changes:

- `PROJECT.md`
- `FEATURES.md`

## Notes

- The README describes the implemented foundations, not a promise that collaboration features are complete.
- Use the planning docs to distinguish current behavior from longer-term product direction.
