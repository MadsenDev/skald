import { useMemo, useState } from 'react';
import type { FolderNode, NoteMeta, VaultSnapshot } from '../../src-shared/types';
import { Icon } from '../ui/icons';
import { Rune, schemaTone } from '../ui/runes';
import { ContextMenu, useContextMenu, type CtxItem } from '../ui/contextMenu';
import { NewNoteDialog, TextDialog, ConfirmDialog } from '../ui/dialogs';
import { api } from '../api';
import { useStore, todayISO } from '../store';
import { activityFor } from './ActivityBar';

type DialogState =
  | { kind: 'new-note'; folder?: string }
  | { kind: 'new-folder'; parent?: string }
  | { kind: 'rename'; path: string; title: string }
  | { kind: 'delete'; path: string; title: string }
  | null;

export function Sidebar() {
  const snapshot = useStore((s) => s.snapshot);
  const view = useStore((s) => s.view);
  if (!snapshot) return null;
  const activity = activityFor(view);
  const titles: Record<string, string> = {
    explorer: 'Explorer',
    tasks: 'Tasks',
    graph: 'Graph',
    settings: 'Settings',
  };
  return (
    <aside className="sidebar">
      <SidebarHead snapshot={snapshot} />
      <div className="sidebar__title">{titles[activity] ?? 'Explorer'}</div>
      <div className="sidebar__body">
        {activity === 'explorer' && <ExplorerTree snapshot={snapshot} />}
        {activity === 'tasks' && <TaskSidebar snapshot={snapshot} />}
        {activity === 'graph' && <GraphSidebar snapshot={snapshot} />}
        {activity === 'settings' && (
          <div className="sidebar__hint">Settings open in the main view.</div>
        )}
      </div>
    </aside>
  );
}

function SidebarHead({ snapshot }: { snapshot: VaultSnapshot }) {
  const switchVault = useStore((s) => s.switchVault);
  const openNote = useStore((s) => s.openNote);
  const [dialog, setDialog] = useState<DialogState>(null);
  const { ctx, open, close } = useContextMenu();

  const vaultMenu: CtxItem[] = [
    { label: 'Reveal vault in file manager', icon: 'external', onClick: () => void api.revealInFolder() },
    { label: 'New folder', icon: 'folder', onClick: () => setDialog({ kind: 'new-folder' }) },
    { sep: true, label: '' },
    { label: 'Switch vault…', icon: 'sync', onClick: switchVault },
  ];

  return (
    <div className="sidebar__head">
      <button className="vault" onClick={(e) => open(e, vaultMenu)} title={snapshot.vaultPath}>
        <span className="vault__name">{snapshot.vaultName}</span>
        <Icon name="chevron" size={13} />
      </button>
      <div className="sidebar__head-actions">
        <button className="ic-btn sm" title="New note — ⌘N" onClick={() => setDialog({ kind: 'new-note' })}>
          <Icon name="plus" size={14} />
        </button>
      </div>
      {ctx && <ContextMenu ctx={ctx} onClose={close} />}
      {dialog?.kind === 'new-note' && (
        <NewNoteDialog
          folders={allFolderPaths(snapshot.tree)}
          onCreate={async (title, folder, schema) => {
            const path = await api.createNote(folder, title, schema);
            openNote(path);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'new-folder' && (
        <TextDialog
          title="New folder"
          lede="A real directory inside the vault."
          label="Folder name"
          submitLabel="Create"
          onSubmit={(name) => api.createFolder(name)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export function ExplorerTree({ snapshot }: { snapshot: VaultSnapshot }) {
  const view = useStore((s) => s.view);
  const selectedPath = useStore((s) => s.selectedPath);
  const openNote = useStore((s) => s.openNote);
  const openLogbook = useStore((s) => s.openLogbook);
  const notesByPath = useMemo(
    () => new Map(snapshot.notes.map((n) => [n.path, n])),
    [snapshot.notes]
  );
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogState>(null);
  const { ctx, open, close } = useContextMenu();
  const notePathRenamed = useStore((s) => s.notePathRenamed);
  const showToast = useStore((s) => s.showToast);
  const pinned = snapshot.settings.pinnedNote;

  const isOpen = (path: string) => openFolders[path] ?? true;

  const noteMenu = (n: NoteMeta): CtxItem[] => [
    { label: 'Open', icon: 'files', onClick: () => openNote(n.path) },
    { label: 'Rename…', icon: 'edit', onClick: () => setDialog({ kind: 'rename', path: n.path, title: n.title }) },
    {
      label: pinned === n.path ? 'Unpin from logbook' : 'Pin to logbook',
      icon: 'pin',
      onClick: () => void api.setSettings({ pinnedNote: pinned === n.path ? null : n.path }),
    },
    { sep: true, label: '' },
    { label: 'Delete…', icon: 'trash', danger: true, onClick: () => setDialog({ kind: 'delete', path: n.path, title: n.title }) },
  ];

  const folderMenu = (path: string): CtxItem[] => [
    { label: 'New note here…', icon: 'plus', onClick: () => setDialog({ kind: 'new-note', folder: path }) },
    { label: 'New subfolder…', icon: 'folder', onClick: () => setDialog({ kind: 'new-folder', parent: path }) },
    { label: 'Reveal in file manager', icon: 'external', onClick: () => void api.revealInFolder(path) },
  ];

  const renderNote = (path: string) => {
    const n = notesByPath.get(path);
    if (!n) return null;
    return (
      <button
        key={path}
        className={'tree__row' + (selectedPath === path && view === 'editor' ? ' is-active' : '')}
        onClick={() => openNote(path)}
        onContextMenu={(e) => open(e, noteMenu(n))}
        title={path}
      >
        <span className="tree__rune" style={{ color: schemaTone(n.schema) }}>
          <Rune schema={n.schema} size={14} />
        </span>
        <span className="tree__label">{n.title}</span>
      </button>
    );
  };

  const renderFolder = (node: FolderNode, depth: number) => (
    <div key={node.path} className="tree__folder">
      <button
        className="tree__folder-row"
        aria-expanded={isOpen(node.path)}
        onClick={() => setOpenFolders({ ...openFolders, [node.path]: !isOpen(node.path) })}
        onContextMenu={(e) => open(e, folderMenu(node.path))}
      >
        <span className={'tree__caret' + (isOpen(node.path) ? ' is-open' : '')}>
          <Icon name="chevron" size={12} />
        </span>
        <span className="tree__folder-name">{node.name}</span>
        <span className="tree__count">{countNotes(node)}</span>
      </button>
      {isOpen(node.path) && (
        <div className="tree__children">
          {node.folders.map((f) => renderFolder(f, depth + 1))}
          {node.notes.map(renderNote)}
        </div>
      )}
    </div>
  );

  return (
    <div className="tree">
      <button
        className={'tree__special' + (view === 'logbook' ? ' is-active' : '')}
        onClick={openLogbook}
      >
        <span className="tree__special-rune" style={{ color: 'var(--schema-daily)' }}>
          <Rune schema="Daily" size={15} />
        </span>
        <span>Today</span>
        <span className="tree__special-meta">⌘D</span>
      </button>

      <div className="tree__divider" />

      {snapshot.tree.folders.map((f) => renderFolder(f, 0))}
      {snapshot.tree.notes.map(renderNote)}

      <div className="tree__footer">
        {snapshot.stats.notes} notes · {snapshot.stats.folders} folders
      </div>

      {ctx && <ContextMenu ctx={ctx} onClose={close} />}

      {dialog?.kind === 'new-note' && (
        <NewNoteDialog
          folders={allFolderPaths(snapshot.tree)}
          initialFolder={dialog.folder}
          onCreate={async (title, folder, schema) => {
            const path = await api.createNote(folder, title, schema);
            openNote(path);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'new-folder' && (
        <TextDialog
          title="New folder"
          lede={dialog.parent ? `Inside ${dialog.parent}/` : 'A real directory inside the vault.'}
          label="Folder name"
          submitLabel="Create"
          onSubmit={(name) =>
            api.createFolder(dialog.parent ? `${dialog.parent}/${name}` : name)
          }
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'rename' && (
        <TextDialog
          title="Rename note"
          lede="Wikilinks pointing at this note are updated across the vault."
          label="New title"
          initial={dialog.title}
          submitLabel="Rename"
          onSubmit={async (name) => {
            const newPath = await api.renameNote(dialog.path, name);
            notePathRenamed(dialog.path, newPath);
            showToast(`Renamed to ${name}`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Delete “${dialog.title}”?`}
          lede="The Markdown file is removed from disk. This cannot be undone from inside Skald."
          confirmLabel="Delete note"
          danger
          onConfirm={() => api.deleteNote(dialog.path)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

function TaskSidebar({ snapshot }: { snapshot: VaultSnapshot }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const views = [
    { id: 'tasks-table' as const, label: 'Table', icon: '≡' },
    { id: 'tasks-kanban' as const, label: 'Board', icon: '▦' },
    { id: 'tasks-calendar' as const, label: 'Calendar', icon: '▥' },
  ];
  const buckets = [
    { label: 'In progress', s: 'working', tone: 'var(--sy-blue)' },
    { label: 'Open', s: 'open', tone: 'var(--tx-2)' },
    { label: 'Blocked', s: 'blocked', tone: 'var(--err)' },
    { label: 'Done', s: 'done', tone: 'var(--ok)' },
  ];
  return (
    <div className="tree">
      <div className="tree__group-label">Views</div>
      {views.map((v) => (
        <button
          key={v.id}
          className={'tree__row mono-row' + (view === v.id ? ' is-active' : '')}
          onClick={() => setView(v.id)}
        >
          <span className="tree__glyph">{v.icon}</span>
          <span className="tree__label">{v.label}</span>
        </button>
      ))}
      <div className="tree__divider" />
      <div className="tree__group-label">Status</div>
      {buckets.map((b) => (
        <div key={b.s} className="tree__row mono-row no-hover">
          <span className="tree__statusdot" style={{ background: b.tone }} />
          <span className="tree__label">{b.label}</span>
          <span className="tree__count">
            {snapshot.tasks.filter((t) => t.status === b.s).length}
          </span>
        </div>
      ))}
      <div className="tree__divider" />
      <div className="tree__group-label">Due</div>
      <div className="tree__row mono-row no-hover">
        <span className="tree__statusdot" style={{ background: 'var(--err)' }} />
        <span className="tree__label">Overdue</span>
        <span className="tree__count">{snapshot.stats.overdue}</span>
      </div>
      <div className="tree__row mono-row no-hover">
        <span className="tree__statusdot" style={{ background: 'var(--warn)' }} />
        <span className="tree__label">Today</span>
        <span className="tree__count">
          {snapshot.tasks.filter((t) => t.due === todayISO() && t.status !== 'done').length}
        </span>
      </div>
    </div>
  );
}

function GraphSidebar({ snapshot }: { snapshot: VaultSnapshot }) {
  const clusters = useMemo(() => {
    const byFolder = new Map<string, number>();
    for (const n of snapshot.graph.nodes) {
      const f = n.folder || 'vault';
      byFolder.set(f, (byFolder.get(f) ?? 0) + 1);
    }
    return [...byFolder.entries()].sort((a, b) => b[1] - a[1]);
  }, [snapshot.graph.nodes]);

  const schemas = useMemo(() => {
    const set = new Map<string, number>();
    for (const n of snapshot.graph.nodes) set.set(n.schema, (set.get(n.schema) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => b[1] - a[1]);
  }, [snapshot.graph.nodes]);

  return (
    <div className="tree">
      <div className="tree__group-label">Clusters</div>
      {clusters.map(([name, count]) => (
        <div key={name} className="tree__row mono-row no-hover">
          <span className="tree__statusdot" style={{ background: 'var(--ac)' }} />
          <span className="tree__label">{name}</span>
          <span className="tree__count">{count}</span>
        </div>
      ))}
      <div className="tree__divider" />
      <div className="tree__group-label">Schemas</div>
      {schemas.map(([s, count]) => (
        <div key={s} className="tree__row mono-row no-hover">
          <span className="tree__rune" style={{ color: schemaTone(s) }}>
            <Rune schema={s} size={14} />
          </span>
          <span className="tree__label">{s}</span>
          <span className="tree__count">{count}</span>
        </div>
      ))}
    </div>
  );
}

export function allFolderPaths(root: FolderNode): string[] {
  const out: string[] = [];
  const walk = (n: FolderNode) => {
    if (n.path) out.push(n.path);
    n.folders.forEach(walk);
  };
  walk(root);
  return out.sort();
}

function countNotes(node: FolderNode): number {
  return node.notes.length + node.folders.reduce((a, f) => a + countNotes(f), 0);
}
