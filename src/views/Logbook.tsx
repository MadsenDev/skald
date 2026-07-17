import { useMemo } from 'react';
import type { VaultSnapshot } from '../../src-shared/types';
import { Rune, schemaTone } from '../ui/runes';
import { Icon } from '../ui/icons';
import { api } from '../api';
import { useStore, todayISO, relTime, relTimeLong } from '../store';

export function LogbookView({ snapshot }: { snapshot: VaultSnapshot }) {
  const openNote = useStore((s) => s.openNote);
  const setView = useStore((s) => s.setView);

  const today = new Date();
  const iso = todayISO();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  const month = today.toLocaleDateString('en-US', { month: 'long' });

  // week strip: activity events per day
  const dow = today.getDay();
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d;
  });
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const intensities = useMemo(() => {
    const counts = week.map(() => 0);
    for (const ev of snapshot.activity) {
      const d = new Date(ev.ts);
      for (let i = 0; i < 7; i++) {
        if (
          d.getFullYear() === week[i].getFullYear() &&
          d.getMonth() === week[i].getMonth() &&
          d.getDate() === week[i].getDate()
        ) {
          counts[i]++;
        }
      }
    }
    return counts;
  }, [snapshot.activity]);
  const maxIntensity = Math.max(1, ...intensities);

  const openTasks = snapshot.tasks.filter((t) => t.status !== 'done');
  const overdue = openTasks.filter((t) => t.due && t.due < iso);
  const threads = useMemo(() => {
    const withDue = openTasks
      .filter((t) => t.due)
      .sort((a, b) => (a.due! < b.due! ? -1 : 1));
    const withoutDue = openTasks.filter((t) => !t.due);
    return [...withDue, ...withoutDue].slice(0, 6);
  }, [snapshot.tasks]);

  const recent = useMemo(
    () => [...snapshot.notes].sort((a, b) => b.updated - a.updated).slice(0, 6),
    [snapshot.notes]
  );

  const editedToday = snapshot.notes.filter((n) => {
    const d = new Date(n.updated);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;

  const pinnedNote = snapshot.settings.pinnedNote
    ? snapshot.notes.find((n) => n.path === snapshot.settings.pinnedNote)
    : null;

  const dailyPath = `${snapshot.settings.dailyFolder}/${iso}.md`;
  const hasDaily = snapshot.notes.some((n) => n.path === dailyPath);

  const weekRange = `${week[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${week[6].toLocaleDateString('en-US', { day: 'numeric' })}`;

  return (
    <div className="logbook">
      <div className="logbook__page">
        <header className="logbook__header">
          <div>
            <div className="logbook__eyebrow">Daily · {weekday}</div>
            <h1 className="logbook__title">
              {month} <span className="day">{today.getDate()}</span>
            </h1>
            <div className="logbook__sub">
              {iso}.md · {snapshot.vaultName} · {snapshot.stats.notes} notes
            </div>
            <button
              className="btn logbook__daily-btn"
              onClick={async () => {
                const path = await api.createDailyNote();
                openNote(path);
              }}
            >
              <Icon name="calendarPlus" size={14} />
              {hasDaily ? "Open today's page" : "Start today's page"}
            </button>
          </div>
          <div className="logbook__head-r">
            <div className="logbook__stat">
              <div className="n">{openTasks.length}</div>
              <div className="l">open</div>
            </div>
            <div className="logbook__stat">
              <div className={'n' + (overdue.length ? ' warn' : '')}>{overdue.length}</div>
              <div className="l">overdue</div>
            </div>
            <div className="logbook__stat">
              <div className="n">{editedToday}</div>
              <div className="l">edited</div>
            </div>
          </div>
        </header>

        <div className="logbook__grid">
          {/* LEFT */}
          <div className="logbook__col">
            <section className="logbook__section">
              <h2>
                This week <span className="count">{weekRange}</span>
              </h2>
              <div className="logbook__weather">
                {week.map((d, i) => {
                  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
                  const intensity = intensities[i];
                  return (
                    <div
                      key={i}
                      className={'logbook__weather__cell' + (intensity === 0 ? ' empty' : '')}
                      data-today={isToday}
                      title={`${intensity} ${intensity === 1 ? 'event' : 'events'}`}
                    >
                      <div className="dl">{dayLabels[i]}</div>
                      <div className="d">{d.getDate()}</div>
                      <div
                        className="bar"
                        style={{
                          transform: `scaleX(${intensity === 0 ? 1 : 0.18 + (0.82 * intensity) / maxIntensity})`,
                          transformOrigin: 'left',
                        }}
                      />
                      {isToday && <span className="dot" />}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="logbook__section">
              <h2>
                Open threads{' '}
                <span className="count">
                  {threads.length ? `${threads.length} up next` : 'all clear'}
                </span>
              </h2>
              <div className="thread-list">
                {threads.map((t) => {
                  const over = !!t.due && t.due < iso;
                  return (
                    <div key={t.id} className="thread-list__row" onClick={() => openNote(t.notePath)}>
                      <div
                        className="checkbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          void api.updateTask(t.id, { status: 'done' });
                        }}
                        title="Mark done"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="thread__title">{t.content}</div>
                        <div className="thread__meta">
                          <span className="src">↗ {t.noteTitle}</span>
                          {t.due && (
                            <>
                              <span>·</span>
                              <span className={over ? 'due' : 'due--ok'}>
                                {over ? 'overdue · ' : 'due '}
                                {t.due.slice(5)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="thread__pri" data-p={t.priority}>
                        {t.priority}
                      </div>
                    </div>
                  );
                })}
                {threads.length === 0 && (
                  <div className="empty-note">No open threads. Write a checkbox in any note and it lands here.</div>
                )}
              </div>
            </section>

            <section className="logbook__section">
              <h2>
                Activity <span className="count">recent</span>
              </h2>
              <div className="saga">
                {snapshot.activity.slice(0, 8).map((ev, i) => (
                  <div key={i} className="saga__row" data-kind={ev.kind}>
                    <div className="t">
                      <span className="verb">{ev.verb}</span>
                      <span className="main">{ev.title}</span>
                      <span> · </span>
                      <span className="ref">{ev.ref}</span>
                    </div>
                    <div className="ts">{relTimeLong(ev.ts)}</div>
                  </div>
                ))}
                {snapshot.activity.length === 0 && (
                  <div className="empty-note">The saga begins when you start writing.</div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div className="logbook__col">
            <section className="logbook__section">
              <h2>Recently touched</h2>
              <div className="recent-list">
                {recent.map((n) => (
                  <div key={n.path} className="recent-list__row" onClick={() => openNote(n.path)}>
                    <div className="l">
                      <span className="rune" style={{ color: schemaTone(n.schema) }}>
                        <Rune schema={n.schema} size={15} />
                      </span>
                      <span className="t">{n.title}</span>
                    </div>
                    <span className="when">{relTime(n.updated)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="logbook__section">
              <h2>Pinned</h2>
              {pinnedNote ? (
                <div
                  className="note-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openNote(pinnedNote.path)}
                >
                  <div className="note-card__text">{pinnedNote.excerpt || pinnedNote.title}</div>
                  <div className="note-card__attr">
                    pinned · {pinnedNote.title} · {relTime(pinnedNote.updated)} ago
                  </div>
                </div>
              ) : (
                <div className="note-card">
                  <div className="note-card__text" style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>
                    Right-click any note in the sidebar and choose “Pin to logbook” to keep it here.
                  </div>
                </div>
              )}
            </section>

            <section className="logbook__section">
              <h2>Vault</h2>
              <div className="vault-stats">
                <span className="k">notes</span>
                <span className="v">{snapshot.stats.notes}</span>
                <span className="k">tasks open</span>
                <span className="v">{snapshot.stats.tasksOpen}</span>
                <span className="k">overdue</span>
                <span className={'v' + (snapshot.stats.overdue ? ' err' : '')}>
                  {snapshot.stats.overdue}
                </span>
                <span className="k">wikilinks</span>
                <span className="v">{snapshot.stats.wikilinks.toLocaleString()}</span>
                <span className="k">links resolved</span>
                <span className="v">{snapshot.stats.resolved.toLocaleString()}</span>
                <span className="k">orphans</span>
                <span className={'v' + (snapshot.stats.orphans ? ' warn' : '')}>
                  {snapshot.stats.orphans}
                </span>
                <span className="k">storage</span>
                <span className="v ok">local · plain files</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn btn--ghost" onClick={() => setView('graph')}>
                  ✦ Open the constellation
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
