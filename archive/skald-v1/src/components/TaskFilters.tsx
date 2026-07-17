import { useEffect, useState } from 'react';
import { useTaskStore } from '../store/taskStore';

export function TaskFilters() {
  const { filters, setFilters, loadTasks } = useTaskStore();
  const [status, setStatus] = useState<string>(filters.status || '');
  const [assignee, setAssignee] = useState<string>(filters.assignedTo || '');
  const [labels, setLabels] = useState<string>((filters.labels || []).join(', '));

  useEffect(() => {
    setStatus(filters.status || '');
    setAssignee(filters.assignedTo || '');
    setLabels((filters.labels || []).join(', '));
  }, [filters]);

  const apply = () => {
    const next = {
      status: status as any || undefined,
      assignedTo: assignee.trim() || undefined,
      labels: labels.split(',').map(s => s.trim()).filter(Boolean),
    };
    setFilters(next as any);
    loadTasks(next as any);
  };

  const clear = () => {
    setStatus('');
    setAssignee('');
    setLabels('');
    setFilters({});
    loadTasks({});
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1"
      >
        <option value="">All</option>
        <option value="open">Open</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input
        placeholder="assignee"
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1"
      />
      <input
        placeholder="labels (comma)"
        value={labels}
        onChange={(e) => setLabels(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1"
      />
      <button onClick={apply} className="text-sm px-2 py-1 rounded bg-gray-100 hover:bg-gray-200">Apply</button>
      <button onClick={clear} className="text-sm px-2 py-1 rounded hover:bg-gray-100">Clear</button>
    </div>
  );
}


