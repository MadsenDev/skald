import { useState, useEffect } from 'react';
import { FiX, FiTrash2 } from 'react-icons/fi';
import { Task, useTaskStore } from '../store/taskStore';
import { buildTaskContent } from '../utils/taskFormat';
import { AnimatePresence, motion } from 'framer-motion';

interface TaskDrawerProps {
  task: Task | null;
  noteTitle?: string;
  onClose: () => void;
}

export function TaskDrawer({ task, noteTitle, onClose }: TaskDrawerProps) {
  const { updateTask, deleteTask, loadTasks } = useTaskStore();
  const [local, setLocal] = useState<{
    content: string;
    status: Task['status'];
    priority: number;
    dueDate: string;
    assignedTo: string;
    labels: string;
  }>({
    content: '',
    status: 'open',
    priority: 0,
    dueDate: '',
    assignedTo: '',
    labels: '',
  });

  useEffect(() => {
    if (!task) return;
    setLocal({
      content: task.content,
      status: task.status,
      priority: task.priority || 0,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      assignedTo: task.assignedTo || '',
      labels: (task.labels || []).join(', '),
    });
  }, [task]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const save = async () => {
    const newContent = buildTaskContent(local.content, {
      dueDate: local.dueDate ? new Date(local.dueDate).getTime() : undefined,
      priority: local.priority || 0,
      assignedTo: local.assignedTo || undefined,
      labels: local.labels.split(',').map(s => s.trim()).filter(Boolean),
    });
    await updateTask(task.id, {
      status: local.status,
      priority: local.priority,
      dueDate: local.dueDate ? new Date(local.dueDate).getTime() : null,
      assignedTo: local.assignedTo || null,
      labels: local.labels.split(',').map(s => s.trim()).filter(Boolean),
      content: newContent,
    });
    await loadTasks();
    onClose();
  };

  const remove = async () => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(task.id);
    await loadTasks();
    onClose();
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-xl z-50 flex flex-col"
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Edit Task</h3>
                {noteTitle && <p className="text-xs text-gray-500">in {noteTitle}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
                <FiX />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={local.content}
                  onChange={(e) => setLocal({ ...local, content: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Describe the task"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={local.status}
                    onChange={(e) => setLocal({ ...local, status: e.target.value as Task['status'] })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={local.priority}
                    onChange={(e) => setLocal({ ...local, priority: parseInt(e.target.value, 10) })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={local.dueDate}
                    onChange={(e) => setLocal({ ...local, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <input
                    placeholder="username"
                    value={local.assignedTo}
                    onChange={(e) => setLocal({ ...local, assignedTo: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
                <input
                  placeholder="comma separated"
                  value={local.labels}
                  onChange={(e) => setLocal({ ...local, labels: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={remove}
                className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-2 rounded"
              >
                <FiTrash2 /> Delete
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-3 py-2 rounded border border-gray-300 text-gray-700">
                  Cancel
                </button>
                <button onClick={save} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


