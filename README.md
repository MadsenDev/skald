# Skald

Skald is an Electron desktop knowledge-base app aimed at a multiplayer, schema-aware, local-first note workflow.

The deeper product direction in this repo calls the concept "ForgeNote": an Obsidian-style vault with stronger structured data, task extraction, search, and eventually safer collaboration and plugin boundaries.

## Current Scope

The app already contains working foundations for:

- vault selection and vault loading
- note list and note editor flows
- task views in table, kanban, and calendar form
- quick switcher / command-palette style search
- daily notes dashboard
- quick capture flows
- theme loading and theme-aware UI
- Electron shell with preload bridge

Planned direction and feature tracking live in [PROJECT.md](./PROJECT.md) and [FEATURES.md](./FEATURES.md).

## Development

```bash
npm install
npm run electron:dev
```

Build commands:

```bash
npm run build
npm run typecheck
npm run electron:pack
```

## Stack

- Electron
- React
- Vite
- TypeScript
- Lexical
- Monaco Editor
- Yjs
- Zustand
- Tailwind CSS

## Notes

- The repository name is `skald`, but the product vision in the planning docs is currently framed as "ForgeNote".
- This project is more advanced than the old placeholder README suggested; use the planning docs before making major product changes.
