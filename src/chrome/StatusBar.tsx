import { useMemo } from 'react';
import { Icon } from '../ui/icons';
import { Rune, schemaTone } from '../ui/runes';
import { useStore } from '../store';

export interface DocStatus {
  schema?: string;
  words?: number;
  lncol?: [number, number] | null;
}

export function StatusBar({ doc }: { doc: DocStatus }) {
  const snapshot = useStore((s) => s.snapshot);
  const dirtyPaths = useStore((s) => s.dirtyPaths);
  const anyDirty = useMemo(() => Object.values(dirtyPaths).some(Boolean), [dirtyPaths]);
  if (!snapshot) return <footer className="statusbar" />;
  const overdue = snapshot.stats.overdue;

  return (
    <footer className="statusbar">
      <div className="statusbar__l">
        <span className="sb-item sb-accent">
          <Icon name="sync" size={12} /> {snapshot.vaultName}
        </span>
        <span className="sb-item">
          <span className={'sb-dot ' + (anyDirty ? 'err' : 'ok')} /> {anyDirty ? 'unsaved' : 'saved'} · local
        </span>
        <span className="sb-item">
          <span className={'sb-dot ' + (overdue ? 'err' : 'ok')} /> {overdue} overdue
        </span>
      </div>
      <div className="statusbar__r">
        {doc.schema && (
          <span className="sb-item">
            <span style={{ color: schemaTone(doc.schema), display: 'inline-flex' }}>
              <Rune schema={doc.schema} size={12} />
            </span>{' '}
            {doc.schema}
          </span>
        )}
        {doc.lncol && (
          <span className="sb-item">
            Ln {doc.lncol[0]}, Col {doc.lncol[1]}
          </span>
        )}
        {doc.words != null && <span className="sb-item">{doc.words} words</span>}
        <span className="sb-item">Markdown</span>
        <span className="sb-item">UTF-8</span>
      </div>
    </footer>
  );
}
