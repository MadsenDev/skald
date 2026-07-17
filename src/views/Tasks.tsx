import { useMemo, useState } from 'react';
import type { TaskItem, TaskStatus, VaultSnapshot } from '../../src-shared/types';
import { api } from '../api';
import { useStore, todayISO, type View } from '../store';

const STATUS_CYCLE: TaskStatus[] = ['open', 'working', 'blocked', 'done'];
const STATUS_FILTERS = ['any', 'open', 'working', 'blocked', 'done'] as const;
const DUE_FILTERS = ['any', 'overdue', 'this week', 'has date'] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type DueFilter = (typeof DUE_FILTERS)[number];

function cycleStatus(t: TaskItem) {
  const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status) + 1) % STATUS_CYCLE.length];
  void api.updateTask(t.id, { status: next });
}

export function TasksView({ snapshot, view }: { snapshot: VaultSnapshot; view: View }) {
  const setView = useStore((s) => s.setView);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('any');
  const [dueFilter, setDueFilter] = useState<DueFilter>('any');
  const iso = todayISO();

  const filtered = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekISO = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    return snapshot.tasks.filter((t) => {
      if (statusFilter !== 'any' && t.status !== statusFilter) return false;
      if (dueFilter === 'overdue' && !(t.due && t.due < iso && t.status !== 'done')) return false;
      if (dueFilter === 'this week' && !(t.due && t.due >= iso && t.due <= weekISO)) return false;
      if (dueFilter === 'has date' && !t.due) return false;
      return true;
    });
  }, [snapshot.tasks, statusFilter, dueFilter, iso]);

  const open = snapshot.tasks.filter((t) => t.status !== 'done').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="tasks-bar">
        <div className="tasks-bar__title">
          Threads{' '}
          <span className="count">
            {open} open · {snapshot.tasks.length} total
          </span>
        </div>
        <div className="tasks-bar__views">
          <button className="tasks-bar__view" aria-selected={view === 'tasks-table'} onClick={() => setView('tasks-table')}>
            Table
          </button>
          <button className="tasks-bar__view" aria-selected={view === 'tasks-kanban'} onClick={() => setView('tasks-kanban')}>
            Kanban
          </button>
          <button className="tasks-bar__view" aria-selected={view === 'tasks-calendar'} onClick={() => setView('tasks-calendar')}>
            Calendar
          </button>
        </div>
        <div className="tasks-bar__spacer" />
        <div className="tasks-bar__filters">
          <span
            className={'tag' + (statusFilter !== 'any' ? ' tag--accent' : '')}
            title="Click to cycle status filter"
            onClick={() =>
              setStatusFilter(
                STATUS_FILTERS[(STATUS_FILTERS.indexOf(statusFilter) + 1) % STATUS_FILTERS.length]
              )
            }
          >
            status: {statusFilter}
          </span>
          <span
            className={'tag' + (dueFilter !== 'any' ? ' tag--accent' : '')}
            title="Click to cycle due filter"
            onClick={() =>
              setDueFilter(DUE_FILTERS[(DUE_FILTERS.indexOf(dueFilter) + 1) % DUE_FILTERS.length])
            }
          >
            due: {dueFilter}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'tasks-table' && <TaskTable tasks={filtered} />}
        {view === 'tasks-kanban' && <TaskKanban tasks={filtered} />}
        {view === 'tasks-calendar' && <TaskCalendar tasks={filtered} />}
      </div>
    </div>
  );
}

function TaskTable({ tasks }: { tasks: TaskItem[] }) {
  const openNote = useStore((s) => s.openNote);
  const iso = todayISO();
  return (
    <div className="task-table">
      <div className="task-table__inner">
        <table>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Status</th>
              <th>Thread</th>
              <th style={{ width: 200 }}>From</th>
              <th style={{ width: 100 }}>Priority</th>
              <th style={{ width: 130 }}>Due</th>
              <th style={{ width: 170 }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const over = !!t.due && t.due < iso && t.status !== 'done';
              return (
                <tr key={t.id}>
                  <td>
                    <span
                      className="status"
                      data-s={t.status}
                      title="Click to cycle status"
                      onClick={() => cycleStatus(t)}
                    >
                      <span className="dot" />
                      {t.status}
                    </span>
                  </td>
                  <td className="t" onClick={() => openNote(t.notePath)}>
                    {t.content}
                  </td>
                  <td className="src" onClick={() => openNote(t.notePath)}>
                    ↗ {t.noteTitle}
                  </td>
                  <td>
                    <span className="pri">{t.priority}</span>
                  </td>
                  <td className={'due' + (over ? ' over' : '')}>
                    {t.due ? (over ? 'overdue · ' : '') + t.due.slice(5) : '—'}
                  </td>
                  <td>
                    {t.tags.map((tag) => (
                      <span key={tag} className="tag" style={{ marginRight: 4 }}>
                        #{tag}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--tx-3)', fontStyle: 'italic' }}>
                  No threads match. Write a checkbox in any note — it shows up here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskKanban({ tasks }: { tasks: TaskItem[] }) {
  const openNote = useStore((s) => s.openNote);
  const iso = todayISO();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<TaskStatus | null>(null);
  const cols: { s: TaskStatus; label: string }[] = [
    { s: 'open', label: 'Open' },
    { s: 'working', label: 'Working' },
    { s: 'blocked', label: 'Blocked' },
    { s: 'done', label: 'Done' },
  ];
  return (
    <div className="kanban">
      <div className="kanban__board">
        {cols.map((c) => {
          const cards = tasks.filter((t) => t.status === c.s);
          return (
            <div
              key={c.s}
              className={'kanban__col' + (dropCol === c.s ? ' drop-target' : '')}
              data-s={c.s}
              onDragOver={(e) => {
                e.preventDefault();
                setDropCol(c.s);
              }}
              onDragLeave={() => setDropCol((d) => (d === c.s ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                setDropCol(null);
                const id = e.dataTransfer.getData('text/task-id') || dragId;
                if (id) void api.updateTask(id, { status: c.s });
                setDragId(null);
              }}
            >
              <div className="kanban__col__head">
                <span className="swatch" />
                {c.label}
                <span className="count">{cards.length}</span>
              </div>
              <div className="kanban__col__body">
                {cards.map((t) => {
                  const over = !!t.due && t.due < iso && t.status !== 'done';
                  return (
                    <div
                      key={t.id}
                      className={'kanban-card' + (dragId === t.id ? ' dragging' : '')}
                      draggable
                      onDragStart={(e) => {
                        setDragId(t.id);
                        e.dataTransfer.setData('text/task-id', t.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropCol(null);
                      }}
                      onDoubleClick={() => openNote(t.notePath)}
                      title="Drag to change status · double-click to open the note"
                    >
                      <div className="kanban-card__title">{t.content}</div>
                      <div className="kanban-card__meta">
                        <span className="src">↗ {t.noteTitle}</span>
                      </div>
                      <div className="kanban-card__meta">
                        <span className={'due' + (over ? ' over' : '')}>
                          {t.due ? (over ? 'overdue · ' : '') + t.due.slice(5) : ''}
                        </span>
                        <span style={{ marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {t.priority}
                        </span>
                      </div>
                      {t.tags.length > 0 && (
                        <div className="kanban-card__tags">
                          {t.tags.map((tag) => (
                            <span key={tag} className="tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCalendar({ tasks }: { tasks: TaskItem[] }) {
  const openNote = useStore((s) => s.openNote);
  const now = new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const iso = todayISO();

  const monthStart = new Date(cursor.y, cursor.m, 1);
  const dow = (monthStart.getDay() + 6) % 7; // Mon=0
  const start = new Date(monthStart);
  start.setDate(monthStart.getDate() - dow);
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const localISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const eventsByDay = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const t of tasks) {
      if (!t.due) continue;
      (map[t.due] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar">
      <div className="calendar__title">
        <h2>{monthLabel}</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            className="btn"
            onClick={() => setCursor(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}
          >
            ‹
          </button>
          <button className="btn" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>
            Today
          </button>
          <button
            className="btn"
            onClick={() => setCursor(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar__head">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="calendar__grid">
        {cells.map((d, i) => {
          const dayISO = localISO(d);
          const out = d.getMonth() !== cursor.m;
          const today = dayISO === iso;
          const evts = eventsByDay[dayISO] ?? [];
          return (
            <div key={i} className={'calendar__cell' + (out ? ' out' : '') + (today ? ' today' : '')}>
              <div className="d">{d.getDate()}</div>
              {evts.slice(0, 3).map((t) => {
                const over = t.due! < iso && t.status !== 'done';
                return (
                  <div
                    key={t.id}
                    className={'calendar__event' + (t.status === 'done' ? ' done' : over ? ' over' : '')}
                    title={`${t.content} — ${t.noteTitle}`}
                    onClick={() => openNote(t.notePath)}
                  >
                    {t.content}
                  </div>
                );
              })}
              {evts.length > 3 && (
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--tx-4)' }}>
                  +{evts.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
