import { useEffect, useState } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import { useVaultStore } from '../store/vaultStore';
import { useSettingsStore } from '../store/settingsStore';
import { FiFlag, FiTrash2, FiCalendar, FiExternalLink, FiEye, FiCopy } from 'react-icons/fi';
import { TaskDrawer } from './TaskDrawer';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

// Status column colors - will use theme variables via inline styles
const statusColumns: { status: Task['status']; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
  { status: 'cancelled', label: 'Cancelled' },
];

const getStatusColumnStyle = (status: Task['status']): React.CSSProperties => {
  // Use theme variables with subtle tints for status columns
  const baseBg = 'var(--theme-bg-secondary)';
  const baseBorder = 'var(--theme-border-primary)';
  
  // For status-specific colors, we'll use a subtle tint approach
  // In dark themes, these will automatically adapt
  return {
    backgroundColor: baseBg,
    borderColor: baseBorder,
  };
};

export function TaskKanbanView() {
  const { tasks, loading, loadTasks, updateTask, deleteTask } = useTaskStore();
  const { notes } = useVaultStore();
  const { loadSettings, setSetting } = useSettingsStore();
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hoverCardId, setHoverCardId] = useState<string | null>(null);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Get settings from store to ensure reactivity
  const settings = useSettingsStore((state) => state.settings);
  const groupBy = settings.kanban?.groupBy ?? 'none';
  
  const handleGroupByChange = async (value: 'none' | 'assignee' | 'label') => {
    await setSetting('kanban.groupBy', value);
  };

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getNoteTitle = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    return note?.title || note?.path || 'Unknown';
  };

  const getPriorityColor = (priority: number): React.CSSProperties => {
    if (priority >= 3) return { color: 'var(--theme-error)' };
    if (priority >= 2) return { color: 'var(--theme-warning)' };
    if (priority >= 1) return { color: 'var(--theme-warning)' };
    return { color: 'var(--theme-text-tertiary)' };
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  // Drag and drop handlers
  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('application/x-task-id', task.id);
    e.dataTransfer.setData('application/x-task-source', task.status);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd = () => {
    setDragOverColumn(null);
  };

  const onDragOverColumn = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const onDragLeaveColumn = (e: React.DragEvent, status: Task['status']) => {
    e.stopPropagation();
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const onDropToColumn = async (e: React.DragEvent, targetStatus: Task['status']) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('application/x-task-id');
    if (!taskId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Enforce WIP limit
    const limit = wipLimits[targetStatus];
    if (typeof limit === 'number') {
      const countInTarget = tasks.filter(t => t.status === targetStatus && t.id !== taskId).length;
      if (countInTarget >= limit) {
        // TODO: toast; for now just return
        return;
      }
    }
    if (task.status !== targetStatus) {
      await updateTask(taskId, { status: targetStatus });
    }
    // Reorder within target column
    const targetTasks = tasks.filter(t => t.status === targetStatus && t.id !== taskId);
    let newOrderIds: string[];
    if (hoverCardId && targetTasks.find(t => t.id === hoverCardId)) {
      // place before hover card
      newOrderIds = [];
      for (const t of targetTasks) {
        if (t.id === hoverCardId) {
          newOrderIds.push(taskId);
        }
        newOrderIds.push(t.id);
      }
    } else {
      // append at end
      newOrderIds = [...targetTasks.map(t => t.id), taskId];
    }
    await window.api.task.reorder(targetStatus, newOrderIds);
    await loadTasks();
    setHoverCardId(null);
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;
  const selectedNoteTitle = selectedTask ? (notes.find(n => n.id === selectedTask.noteId)?.title || '') : '';
  // Get WIP limits from settings
  const wipLimits = settings.kanban?.wipLimits ?? {};

  const setLimit = async (status: Task['status'], value: number | undefined) => {
    const next = { ...wipLimits, [status]: value };
    await setSetting('kanban.wipLimits', next);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading tasks...</div>
      </div>
    );
  }

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
        onClick: () => handleStatusChange(contextMenuTask.id, 'done'),
        disabled: contextMenuTask.status === 'done',
      },
      {
        id: 'mark-cancelled',
        label: 'Mark as Cancelled',
        onClick: () => handleStatusChange(contextMenuTask.id, 'cancelled'),
        disabled: contextMenuTask.status === 'cancelled',
      },
      { id: 'sep3', label: '', separator: true },
      {
        id: 'delete',
        label: 'Delete Task',
        icon: <FiTrash2 className="w-4 h-4" />,
        onClick: () => handleDelete(contextMenuTask.id),
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
      <div 
        className="border-b px-4 py-3"
        style={{
          borderColor: 'var(--theme-border-primary)',
          backgroundColor: 'var(--theme-bg-primary)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 
            className="text-lg font-semibold"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Tasks - Kanban View
          </h2>
          <div 
            className="flex items-center gap-4 text-sm"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            <label className="flex items-center gap-1">
              Group by
              <select
                value={groupBy}
                onChange={(e) => handleGroupByChange(e.target.value as 'none' | 'assignee' | 'label')}
                className="rounded px-2 py-1"
                style={{
                  borderColor: 'var(--theme-border-primary)',
                  backgroundColor: 'var(--theme-bg-primary)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <option value="none">None</option>
                <option value="assignee">Assignee</option>
                <option value="label">Label</option>
              </select>
            </label>
            {statusColumns.map(col => (
              <label key={col.status} className="flex items-center gap-1">
                <span className="hidden md:inline">{col.label} WIP</span>
                <input
                  type="number"
                  min={0}
                  value={wipLimits[col.status] ?? ''}
                  onChange={(e) => setLimit(col.status, e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 rounded px-2 py-1"
                  style={{
                    borderColor: 'var(--theme-border-primary)',
                    backgroundColor: 'var(--theme-bg-primary)',
                    color: 'var(--theme-text-primary)',
                  }}
                  placeholder="-"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-x-auto p-4"
        style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
      >
        <div className="inline-flex gap-4 h-full w-max">
          {statusColumns.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.status);
            const limit = wipLimits[column.status];
            const overLimit = typeof limit === 'number' && columnTasks.length > limit;
            // Build groups
            const groups: Array<{ key: string; title: string; tasks: Task[] }> = [];
            if (groupBy === 'assignee') {
              const map = new Map<string, Task[]>();
              for (const t of columnTasks) {
                const key = t.assignedTo || '(Unassigned)';
                (map.get(key) || map.set(key, []).get(key)!).push(t);
              }
              for (const [key, list] of map.entries()) {
                groups.push({ key, title: key, tasks: list });
              }
              groups.sort((a, b) => a.title.localeCompare(b.title));
            } else if (groupBy === 'label') {
              const map = new Map<string, Task[]>();
              for (const t of columnTasks) {
                if (t.labels.length === 0) {
                  (map.get('(No labels)') || map.set('(No labels)', []).get('(No labels)')!).push(t);
                } else {
                  for (const lbl of t.labels) {
                    (map.get(lbl) || map.set(lbl, []).get(lbl)!).push(t);
                  }
                }
              }
              for (const [key, list] of map.entries()) {
                groups.push({ key, title: key.startsWith('#') ? key : key, tasks: list });
              }
              groups.sort((a, b) => a.title.localeCompare(b.title));
            } else {
              groups.push({ key: 'all', title: '', tasks: columnTasks });
            }
            
            return (
              <div
                key={column.status}
                className={`w-[320px] flex-none rounded-lg border-2 flex flex-col ${dragOverColumn === column.status ? 'ring-2' : ''}`}
                style={{
                  ...getStatusColumnStyle(column.status),
                  borderColor: overLimit ? 'var(--theme-error)' : getStatusColumnStyle(column.status).borderColor,
                  boxShadow: dragOverColumn === column.status ? '0 0 0 2px var(--theme-accent)' : undefined,
                }}
                onDragOver={(e) => onDragOverColumn(e, column.status)}
                onDragEnter={(e) => onDragOverColumn(e, column.status)}
                onDragLeave={(e) => onDragLeaveColumn(e, column.status)}
                onDrop={(e) => onDropToColumn(e, column.status)}
              >
                <div 
                  className="p-3 border-b"
                  style={{
                    borderColor: 'var(--theme-border-primary)',
                  }}
                >
                  <h3 
                    className="font-semibold"
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    {column.label}
                    <span 
                      className="ml-2 text-sm font-normal"
                      style={{ color: 'var(--theme-text-secondary)' }}
                    >
                      ({columnTasks.length}{typeof limit === 'number' ? ` / ${limit}` : ''})
                    </span>
                  </h3>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-2 space-y-4"
                  onDragOver={(e) => onDragOverColumn(e, column.status)}
                  onDragEnter={(e) => onDragOverColumn(e, column.status)}
                  onDragLeave={(e) => onDragLeaveColumn(e, column.status)}
                  onDrop={(e) => onDropToColumn(e, column.status)}
                >
                  {columnTasks.length === 0 ? (
                    <div 
                      className="text-center text-sm py-8"
                      style={{ color: 'var(--theme-text-tertiary)' }}
                    >
                      No tasks
                    </div>
                  ) : (
                    groups.map(group => (
                      <div key={group.key}>
                        {groupBy !== 'none' && (
                          <div 
                            className="text-xs font-medium px-1 pb-1"
                            style={{ color: 'var(--theme-text-secondary)' }}
                          >
                            {group.title}
                          </div>
                        )}
                        <div className="space-y-2">
                        {group.tasks.map((task) => {
                      const isOverdue = task.dueDate ? (new Date(task.dueDate).getTime() < Date.now() && task.status !== 'done' && task.status !== 'cancelled') : false;
                      return (
                      <div
                        key={task.id}
                        className="rounded-lg shadow-sm p-3 border hover:shadow-md transition-shadow min-w-0"
                        style={{
                          backgroundColor: 'var(--theme-bg-primary)',
                          borderColor: isOverdue ? 'var(--theme-error)' : 'var(--theme-border-primary)',
                        }}
                        draggable
                        onDragStart={(e) => onDragStart(e, task)}
                        onDragEnd={onDragEnd}
                        onClick={() => setSelectedTaskId(task.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenuTask(task);
                          showContextMenu(e);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHoverCardId(task.id);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p 
                            className="text-sm flex-1 break-words"
                            style={{ color: 'var(--theme-text-primary)' }}
                          >
                            {task.content}
                          </p>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="ml-2"
                            style={{
                              color: 'var(--theme-text-tertiary)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = 'var(--theme-error)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--theme-text-tertiary)';
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                        
                        <div 
                          className="flex items-center gap-2 text-xs mb-2"
                          style={{ color: 'var(--theme-text-secondary)' }}
                        >
                          {task.priority > 0 && (
                            <span className="flex items-center" style={getPriorityColor(task.priority)}>
                              <FiFlag size={12} className="mr-1" />
                              {task.priority}
                            </span>
                          )}
                          {task.dueDate && (
                            <span 
                              className="flex items-center"
                              style={{
                                color: isOverdue ? 'var(--theme-error)' : 'var(--theme-text-secondary)',
                                fontWeight: isOverdue ? 600 : undefined,
                              }}
                            >
                              <FiCalendar size={12} className="mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        {task.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.labels.map((label) => (
                              <span
                                key={label}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-primary))',
                                  color: 'var(--theme-accent)',
                                }}
                              >
                                #{label}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className="text-xs mt-2"
                          style={{ color: 'var(--theme-text-tertiary)' }}
                        >
                          {getNoteTitle(task.noteId)}
                        </div>
                        
                        {task.assignedTo && (
                          <div 
                            className="text-xs mt-1"
                            style={{ color: 'var(--theme-text-secondary)' }}
                          >
                            @{task.assignedTo}
                          </div>
                        )}
                      </div>
                      );
                        })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <TaskDrawer
          task={selectedTask}
          noteTitle={selectedNoteTitle}
          onClose={() => setSelectedTaskId(null)}
        />
      </div>
    </div>
  );
}

