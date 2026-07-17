import { useMemo } from 'react';
import { Rune, schemaTone } from '../ui/runes';
import { useStore, type View } from '../store';
import { titleFromPath } from '../../src-shared/notes';

export function TabStrip() {
  const snapshot = useStore((s) => s.snapshot);
  const tabs = useStore((s) => s.tabs);
  const view = useStore((s) => s.view);
  const selectedPath = useStore((s) => s.selectedPath);
  const openNote = useStore((s) => s.openNote);
  const openLogbook = useStore((s) => s.openLogbook);
  const closeTab = useStore((s) => s.closeTab);
  const dirtyPaths = useStore((s) => s.dirtyPaths);

  const notesByPath = useMemo(
    () => new Map((snapshot?.notes ?? []).map((n) => [n.path, n])),
    [snapshot?.notes]
  );

  const special = specialFor(view);

  return (
    <div className="tabstrip">
      <div className="tabstrip__tabs">
        {tabs.map((tab) => {
          if (tab.kind === 'logbook') {
            const active = view === 'logbook';
            return (
              <div key={tab.id} className={'tab' + (active ? ' is-active' : '')} onClick={openLogbook}>
                <span className="tab__rune" style={{ color: schemaTone('Daily') }}>
                  <Rune schema="Daily" size={13} />
                </span>
                <span className="tab__label">Today</span>
                <CloseBtn onClose={() => closeTab(tab.id)} />
              </div>
            );
          }
          const note = notesByPath.get(tab.id);
          const active = view === 'editor' && selectedPath === tab.id;
          return (
            <div
              key={tab.id}
              className={'tab' + (active ? ' is-active' : '')}
              onClick={() => openNote(tab.id)}
              title={tab.id}
            >
              <span className="tab__rune" style={{ color: schemaTone(note?.schema) }}>
                <Rune schema={note?.schema ?? 'Note'} size={13} />
              </span>
              <span className="tab__label">{(note?.title ?? titleFromPath(tab.id)) + '.md'}</span>
              {dirtyPaths[tab.id] && <span className="tab__dirty" />}
              <CloseBtn onClose={() => closeTab(tab.id)} />
            </div>
          );
        })}
        {special && (
          <div className="tab is-active is-special">
            <span className="tab__glyph">{special.glyph}</span>
            <span className="tab__label">{special.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      className="tab__close"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

function specialFor(view: View): { glyph: string; label: string } | null {
  if (view.startsWith('tasks')) return { glyph: '▦', label: 'Tasks' };
  if (view === 'graph') return { glyph: '✦', label: 'Graph' };
  if (view === 'settings') return { glyph: '⚙', label: 'Settings' };
  return null;
}
