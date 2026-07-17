import { useEffect, useMemo, useState } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import { useVaultStore } from '../store/vaultStore';
import { useSettingsStore } from '../store/settingsStore';
import { buildTaskContent } from '../utils/taskFormat';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiEye, FiCopy, FiTrash2 } from 'react-icons/fi';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function formatISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TaskCalendarView() {
  const { tasks, loadTasks, updateTask } = useTaskStore();
  const { notes } = useVaultStore();
  const settings = useSettingsStore((state) => state.settings);
  const firstDayOfWeek = settings.calendar?.firstDayOfWeek ?? 0; // Default to Sunday (0)
  const [current, setCurrent] = useState(startOfMonth(new Date()));
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createNoteId, setCreateNoteId] = useState<string>('');
  const [createPriority, setCreatePriority] = useState<number>(0);
  const [createAssignee, setCreateAssignee] = useState<string>('');
  const [createLabels, setCreateLabels] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Day names array - will be reordered based on firstDayOfWeek
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderedDayNames = useMemo(() => {
    return [...dayNames.slice(firstDayOfWeek), ...dayNames.slice(0, firstDayOfWeek)];
  }, [firstDayOfWeek]);

  const { weeks, monthLabel, dayCells } = useMemo(() => {
    const start = startOfMonth(current);
    const end = endOfMonth(current);
    // Calculate grid start based on firstDayOfWeek setting
    const startWeekday = start.getDay();
    // Adjust for custom first day of week
    let offset = startWeekday - firstDayOfWeek;
    if (offset < 0) offset += 7;
    const gridStart = addDays(start, -offset);
    const totalDays = 42; // 6 weeks grid
    const days: Date[] = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
    const byDate: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = formatISODate(new Date(t.dueDate));
      (byDate[key] ||= []).push(t);
    }
    const cells = days.map(d => ({
      date: d,
      inMonth: d.getMonth() === current.getMonth(),
      key: formatISODate(d),
      tasks: byDate[formatISODate(d)] || [],
    }));
    return {
      weeks: 6,
      monthLabel: current.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
      dayCells: cells,
    };
  }, [current, tasks, firstDayOfWeek]);

  const prevMonth = () => setCurrent(startOfMonth(new Date(current.getFullYear(), current.getMonth() - 1, 1)));
  const nextMonth = () => setCurrent(startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1)));

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenuTask) return [];

    const note = notes.find(n => n.id === contextMenuTask.noteId);
    const notePath = note?.path;

    return [
      {
        id: 'open-note',
        label: 'Open Note',
        icon: <FiExternalLink className="w-4 h-4" />,
        onClick: () => {
          if (notePath) {
            window.dispatchEvent(new CustomEvent('navigate-to-note', { detail: { path: notePath } }));
          }
        },
        disabled: !notePath,
      },
      {
        id: 'peek-note',
        label: 'Peek Note',
        icon: <FiEye className="w-4 h-4" />,
        onClick: () => {
          if (notePath) {
            window.dispatchEvent(new CustomEvent('peek-note', { detail: { path: notePath } }));
          }
        },
        disabled: !notePath,
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'copy-content',
        label: 'Copy Task Content',
        icon: <FiCopy className="w-4 h-4" />,
        onClick: async () => {
          await navigator.clipboard.writeText(contextMenuTask.content);
        },
      },
      {
        id: 'copy-note-path',
        label: 'Copy Note Path',
        icon: <FiCopy className="w-4 h-4" />,
        onClick: async () => {
          if (notePath) {
            await navigator.clipboard.writeText(notePath);
          }
        },
        disabled: !notePath,
      },
      { id: 'sep2', label: '', separator: true },
      {
        id: 'mark-done',
        label: 'Mark as Done',
        onClick: async () => {
          await updateTask(contextMenuTask.id, { status: 'done' });
          await loadTasks();
        },
        disabled: contextMenuTask.status === 'done',
      },
      {
        id: 'mark-cancelled',
        label: 'Mark as Cancelled',
        onClick: async () => {
          await updateTask(contextMenuTask.id, { status: 'cancelled' });
          await loadTasks();
        },
        disabled: contextMenuTask.status === 'cancelled',
      },
      { id: 'sep3', label: '', separator: true },
      {
        id: 'delete',
        label: 'Delete Task',
        icon: <FiTrash2 className="w-4 h-4" />,
        onClick: async () => {
          if (confirm('Are you sure you want to delete this task?')) {
            await useTaskStore.getState().deleteTask(contextMenuTask.id);
            await loadTasks();
          }
        },
        danger: true,
      },
    ];
  };

  return (
    <div className="flex-1 flex flex-col">
      <ContextMenu
        items={getContextMenuItems()}
        position={contextMenu}
        onClose={() => {
          hideContextMenu();
          setContextMenuTask(null);
        }}
      />
      <div className="border-b border-gray-200 px-4 py-3 bg-white flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded hover:bg-gray-100">
          <FiChevronLeft />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <button onClick={nextMonth} className="p-2 rounded hover:bg-gray-100">
          <FiChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 text-xs font-medium text-gray-500">
        {orderedDayNames.map(d => (
          <div key={d} className="bg-white px-2 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 flex-1">
        {dayCells.map((cell, idx) => (
          <div
            key={idx}
            className={`bg-white min-h-[110px] p-2 ${cell.inMonth ? '' : 'opacity-50'}`}
            onClick={() => {
              setCreateDate(cell.date);
              if (!createNoteId && notes[0]) setCreateNoteId(notes[0].id);
            }}
          >
            <div className="text-xs text-gray-500 mb-1">{cell.date.getDate()}</div>
            <div
              className="space-y-1 min-h-[60px]"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={async (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('application/x-task-id');
                if (!id) return;
                const newDate = new Date(cell.date);
                // Set time to noon to avoid TZ edge cases; only date is used
                newDate.setHours(12, 0, 0, 0);
                await updateTask(id, { dueDate: newDate.getTime() });
                await loadTasks();
              }}
            >
              {cell.tasks.slice(0, 4).map(t => (
                <div
                  key={t.id}
                  className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 truncate cursor-move"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-task-id', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenuTask(t);
                    showContextMenu(e);
                  }}
                >
                  {t.content}
                </div>
              ))}
              {cell.tasks.length > 4 && (
                <div className="text-[11px] text-gray-500">+{cell.tasks.length - 4} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {createDate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setCreateDate(null)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[480px] max-w-[92vw]">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">New Task on {createDate.toLocaleDateString()}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <select
                    value={createNoteId}
                    onChange={(e) => setCreateNoteId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {notes.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={createPriority}
                    onChange={(e) => setCreatePriority(parseInt(e.target.value, 10))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value={0}>None</option>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <input
                    value={createAssignee}
                    onChange={(e) => setCreateAssignee(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="@user"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
                  <input
                    value={createLabels}
                    onChange={(e) => setCreateLabels(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="comma separated"
                  />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setCreateDate(null)} className="px-3 py-2 rounded border border-gray-300 text-gray-700">
                Cancel
              </button>
              <button
                disabled={saving || !createTitle.trim() || !createNoteId}
                onClick={async () => {
                  if (!createDate) return;
                  setSaving(true);
                  try {
                    const note = notes.find(n => n.id === createNoteId);
                    if (!note) return;
                    const original = await window.api.vault.readFile(note.path);
                    const contentLine = buildTaskContent(createTitle.trim(), {
                      dueDate: createDate.getTime(),
                      priority: createPriority || 0,
                      assignedTo: createAssignee || undefined,
                      labels: createLabels.split(',').map(s => s.trim()).filter(Boolean),
                    });
                    const appended = original.endsWith('\n') ? original : original + '\n';
                    const updated = appended + `- [ ] ${contentLine}\n`;
                    await window.api.vault.writeFile(note.path, updated);
                    // reset
                    setCreateTitle('');
                    setCreatePriority(0);
                    setCreateAssignee('');
                    setCreateLabels('');
                    setCreateDate(null);
                    await loadTasks();
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


