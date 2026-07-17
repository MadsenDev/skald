import { useEffect, useState } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import { useVaultStore } from '../store/vaultStore';
import { FiTrash2, FiExternalLink, FiEye, FiCopy } from 'react-icons/fi';
import { buildTaskContent } from '../utils/taskFormat';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

export function TaskTableView() {
  const { tasks, loading, filters, loadTasks, updateTask, deleteTask, setFilters } = useTaskStore();
  const { notes } = useVaultStore();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const getNoteTitle = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    return note?.title || note?.path || 'Unknown';
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleFieldUpdate = async (task: Task, updates: Partial<Task>) => {
    // Build updated content line with metadata tokens
    const merged = { ...task, ...updates };
    const newContent = buildTaskContent(merged.content, {
      dueDate: merged.dueDate || undefined,
      priority: merged.priority || 0,
      assignedTo: merged.assignedTo || undefined,
      labels: merged.labels || [],
    });
    await updateTask(task.id, { ...updates, content: newContent });
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
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
      <div className="border-b border-gray-200 px-4 py-3 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Tasks - Table View</h2>
          <div className="flex gap-2">
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as Task['status'] || undefined })}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0" style={{ backgroundColor: 'var(--theme-bg-secondary)' }}>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Task</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Note</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Assignee</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Labels</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody style={{ backgroundColor: 'var(--theme-bg-primary)' }}>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--theme-text-tertiary)' }}>
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => (
                <tr 
                  key={task.id} 
                  className="task-table-row"
                  style={{
                    borderTop: index > 0 ? '1px solid var(--theme-border-primary)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-bg-primary)';
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuTask(task);
                    showContextMenu(e);
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(task.status)} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm break-words" style={{ color: 'var(--theme-text-primary)' }}>{task.content}</div>
                    {task.assignedTo && (
                      <div className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>@{task.assignedTo}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{getNoteTitle(task.noteId)}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={task.priority || 0}
                    onChange={(e) => handleFieldUpdate(task, { priority: parseInt(e.target.value, 10) })}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={0}>None</option>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ''}
                    onChange={(e) => handleFieldUpdate(task, { dueDate: e.target.value ? new Date(e.target.value).getTime() : null })}
                    className={`text-sm border rounded px-2 py-1 ${task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'done' && task.status !== 'cancelled' ? 'border-red-300 text-red-600' : 'border-gray-300'}`}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="text"
                    placeholder="assignee"
                    value={task.assignedTo || ''}
                    onChange={(e) => handleFieldUpdate(task, { assignedTo: e.target.value || null })}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  </td>
                  <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="labels (comma separated)"
                    value={task.labels.join(', ')}
                    onChange={(e) => handleFieldUpdate(task, { labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

