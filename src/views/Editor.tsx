import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NotePayload, VaultSnapshot } from '../../src-shared/types';
import { renderMarkdown, type MdContext } from '../markdown';
import { Rune, schemaTone } from '../ui/runes';
import { TextDialog } from '../ui/dialogs';
import { api } from '../api';
import { useStore, todayISO, relTime } from '../store';
import { taskId } from '../../src-shared/tasks';
import { countWords } from '../../src-shared/notes';

export function EditorView({
  snapshot,
  path,
}: {
  snapshot: VaultSnapshot;
  path: string;
}) {
  const openNote = useStore((s) => s.openNote);
  const setDirtyStore = useStore((s) => s.setDirty);
  const setDocStatus = useStore((s) => s.setDocStatus);
  const notePathRenamed = useStore((s) => s.notePathRenamed);
  const showToast = useStore((s) => s.showToast);
  const marginOn = snapshot.settings.marginOn;

  const [payload, setPayload] = useState<NotePayload | null>(null);
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [draft, setDraft] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [lncol, setLncol] = useState<[number, number] | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = useMemo(
    () => snapshot.notes.find((n) => n.path === path) ?? null,
    [snapshot.notes, path]
  );
  const dirty = draft !== null && draft !== payload?.content;

  const load = useCallback(async () => {
    try {
      const p = await api.readNote(path);
      setPayload(p);
      setDraft(null);
      setDirtyStore(path, false);
    } catch {
      setPayload(null);
    }
  }, [path, setDirtyStore]);

  // load on note switch
  useEffect(() => {
    setMode('preview');
    setDraft(null);
    setLncol(null);
    void load();
  }, [path]);

  // refresh from disk when the vault changes under us (unless mid-edit)
  useEffect(() => {
    if (!dirty && meta && payload && meta.updated > 0) void load();
  }, [meta?.updated]);

  // report status bar info
  useEffect(() => {
    const words =
      draft !== null ? countWords(draft) : payload ? payload.meta.wordCount : meta?.wordCount;
    setDocStatus({
      schema: meta?.schema,
      words,
      lncol: mode === 'source' ? lncol : null,
    });
    return () => setDocStatus({});
  }, [meta?.schema, payload, draft, mode, lncol]);

  const scheduleSave = useCallback(
    (content: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void api.writeNote(path, content).then(() => {
          setPayload((p) => (p ? { ...p, content } : p));
          setDirtyStore(path, false);
        });
      }, snapshot.settings.autosaveMs);
    },
    [path, snapshot.settings.autosaveMs, setDirtyStore]
  );

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (draft !== null && dirty) {
      void api.writeNote(path, draft).then(() => {
        setPayload((p) => (p ? { ...p, content: draft } : p));
        setDirtyStore(path, false);
        showToast('Saved');
      });
    }
  }, [draft, dirty, path]);

  // ⌘S / ⌘E
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') {
        e.preventDefault();
        saveNow();
      }
      if (mod && e.key === 'e') {
        e.preventDefault();
        setMode((m) => (m === 'preview' ? 'source' : 'preview'));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [saveNow]);

  // flush pending save when leaving the note
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [path]);

  if (!meta) {
    return <div className="empty-note">This note is gone — it may have been deleted on disk.</div>;
  }

  const content = draft ?? payload?.content ?? '';
  const body = payload?.body ?? '';
  const bodyStartLine = payload?.bodyStartLine ?? 0;

  const mdCtx: MdContext = {
    resolve: (target) => {
      const lower = target.trim().toLowerCase();
      const hit = snapshot.notes.find(
        (n) =>
          n.title.toLowerCase() === lower ||
          n.path.toLowerCase().replace(/\.md$/, '').split('/').pop() === lower
      );
      return hit?.path ?? null;
    },
    openNote,
    openExternal: (url) => window.open(url),
    toggleTask: (line, done) => {
      void api.updateTask(taskId(path, line), { status: done ? 'done' : 'open' });
    },
    todayISO: todayISO(),
    lineOffset: bodyStartLine,
  };

  const noteTasks = snapshot.tasks.filter((t) => t.notePath === path);
  const fmEntries = Object.entries(meta.frontmatter).filter(([k]) => k !== 'schema');

  const onSourceChange = (v: string) => {
    setDraft(v);
    setDirtyStore(path, true);
    scheduleSave(v);
  };

  const updateLnCol = () => {
    const ta = taRef.current;
    if (!ta) return;
    const upto = ta.value.slice(0, ta.selectionStart);
    const lines = upto.split('\n');
    setLncol([lines.length, lines[lines.length - 1].length + 1]);
  };

  const scrollToHeading = (line: number) => {
    setMode('preview');
    requestAnimationFrame(() => {
      const el = previewRef.current?.querySelector(`#h-${line}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className={'editor-shell' + (marginOn ? '' : ' editor-shell--no-margin')}>
      <div className="editor-pane">
        <div className="editor-page" ref={previewRef}>
          <div className="editor-eyebrow">
            <span className="dot" />
            <span className="path">{path}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--tx-3)' }}>
              {dirty ? 'editing…' : `edited ${relTime(meta.updated)} ago`}
            </span>
            <span className="editor-mode-toggle">
              <button aria-selected={mode === 'preview'} onClick={() => setMode('preview')} title="Reading view — ⌘E">
                read
              </button>
              <button aria-selected={mode === 'source'} onClick={() => setMode('source')} title="Source view — ⌘E">
                src
              </button>
            </span>
          </div>

          <h1
            className="editor-title"
            title="Double-click to rename"
            onDoubleClick={() => setRenaming(true)}
          >
            {meta.title}
          </h1>

          {mode === 'preview' ? (
            <>
              <div className="editor-frontmatter" data-schema={meta.schema}>
                <div className="k">title</div>
                <div className="v">{meta.title}</div>
                <div className="k">schema</div>
                <div className="v">
                  <span className="pill">{meta.schema}</span>
                </div>
                {fmEntries.map(([k, v]) => (
                  <FmRow key={k} k={k} v={v} ctx={mdCtx} />
                ))}
                {meta.links.length > 0 && (
                  <>
                    <div className="k">links</div>
                    <div className="v">
                      {meta.links.map((l, i) => {
                        const target = snapshot.notes.find((n) => n.path === l);
                        return (
                          <span key={l}>
                            {i > 0 && ' · '}
                            <a
                              className="wikilink"
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                openNote(l);
                              }}
                            >
                              [[{target?.title ?? l}]]
                            </a>
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="editor-body">
                {body.trim() ? (
                  renderMarkdown(body, mdCtx)
                ) : (
                  <p className="editor-empty-hint">
                    An empty page. Switch to <code>src</code> (⌘E) and start writing.
                  </p>
                )}
              </div>

              <AddThread path={path} />

              {payload && payload.backlinks.length > 0 && (
                <div className="editor-foot">
                  <div className="editor-foot__label">
                    Linked from · {payload.backlinks.length}{' '}
                    {payload.backlinks.length === 1 ? 'note' : 'notes'}
                  </div>
                  <div className="editor-foot__chips">
                    {payload.backlinks.map((b) => (
                      <span
                        key={b.path}
                        className="chip"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openNote(b.path)}
                      >
                        <span className="chip__rune" style={{ color: schemaTone(b.schema) }}>
                          <Rune schema={b.schema} size={13} />
                        </span>
                        {b.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <textarea
              ref={taRef}
              className="editor-source"
              value={content}
              spellCheck={false}
              onChange={(e) => onSourceChange(e.target.value)}
              onKeyUp={updateLnCol}
              onClick={updateLnCol}
              onBlur={saveNow}
              style={{ fontSize: snapshot.settings.editorFontSize - 1.5 }}
            />
          )}
        </div>
      </div>

      {marginOn && (
        <aside className="margin">
          <div className="margin__group">
            <div className="margin__heading">
              Backlinks <span className="count">{payload?.backlinks.length ?? 0}</span>
            </div>
            {(payload?.backlinks ?? []).map((b) => (
              <div key={b.path} className="margin__item" onClick={() => openNote(b.path)}>
                <div className="margin__item__title">{b.title}</div>
                <div className="margin__item__snippet">{b.snippet}</div>
                <div className="margin__item__meta">
                  <span>{relTime(b.updated)} ago</span>
                  <span>·</span>
                  <span>{b.folder}</span>
                </div>
              </div>
            ))}
            {(payload?.backlinks.length ?? 0) === 0 && (
              <div className="margin__gloss">Nothing links here yet. Mention this note as [[{meta.title}]] elsewhere.</div>
            )}
          </div>

          {noteTasks.length > 0 && (
            <div className="margin__group">
              <div className="margin__heading">
                Threads <span className="count">{noteTasks.filter((t) => t.status !== 'done').length}</span>
              </div>
              {noteTasks.map((t) => {
                const over = !!t.due && t.due < todayISO() && t.status !== 'done';
                return (
                  <div key={t.id} className="margin__task" data-done={t.status === 'done'}>
                    <span
                      className="checkbox"
                      data-done={t.status === 'done'}
                      onClick={() =>
                        void api.updateTask(t.id, {
                          status: t.status === 'done' ? 'open' : 'done',
                        })
                      }
                    />
                    <span className="t">{t.content}</span>
                    {t.due && <span className={'due' + (over ? ' over' : '')}>{t.due.slice(5)}</span>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="margin__group">
            <div className="margin__heading">Outline</div>
            <div className="margin__outline">
              {meta.headings.map((h) => (
                <a
                  key={h.line}
                  href="#"
                  style={{ paddingLeft: 8 + (h.level - 1) * 10 }}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToHeading(h.line);
                  }}
                >
                  {h.text}
                </a>
              ))}
              {meta.headings.length === 0 && (
                <div className="margin__gloss">No headings yet.</div>
              )}
            </div>
          </div>
        </aside>
      )}

      {renaming && (
        <TextDialog
          title="Rename note"
          lede="Wikilinks pointing at this note are updated across the vault."
          label="New title"
          initial={meta.title}
          submitLabel="Rename"
          onSubmit={async (name) => {
            const newPath = await api.renameNote(path, name);
            notePathRenamed(path, newPath);
          }}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  );
}

function FmRow({ k, v, ctx }: { k: string; v: unknown; ctx: MdContext }) {
  const text = Array.isArray(v) ? v.map(String).join(' · ') : String(v);
  return (
    <>
      <div className="k">{k}</div>
      <div className="v">{text}</div>
    </>
  );
}

function AddThread({ path }: { path: string }) {
  const [value, setValue] = useState('');
  const submit = async () => {
    const v = value.trim();
    if (!v) return;
    await api.addTask(path, v);
    setValue('');
  };
  return (
    <div className="add-task-row">
      <span className="checkbox" style={{ opacity: 0.45 }} />
      <input
        value={value}
        placeholder="Add a thread — becomes a task everywhere…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
      />
      {value.trim() && (
        <button className="btn btn--ghost" onClick={() => void submit()}>
          ↵ add
        </button>
      )}
    </div>
  );
}
