import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useVaultStore } from '../store/vaultStore';
import { useTaskStore } from '../store/taskStore';
import { buildTaskContent } from '../utils/taskFormat';

export function QuickCapture() {
  const { notes } = useVaultStore();
  const { loadTasks } = useTaskStore();
  const [text, setText] = useState('');
  const [due, setDue] = useState<string>('');
  const [priority, setPriority] = useState<number>(0);
  const [assignee, setAssignee] = useState<string>('');
  const [labels, setLabels] = useState<string>('');
  const [targetNoteId, setTargetNoteId] = useState<string>(notes[0]?.id || '');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const note = notes.find(n => n.id === targetNoteId) || notes[0];
      if (!note) {
        alert('No notes available. Create a note first.');
        setSaving(false);
        return;
      }
      const original = await window.api.vault.readFile(note.path);
      const contentLine = buildTaskContent(text.trim(), {
        dueDate: due ? new Date(due).getTime() : undefined,
        priority: priority || 0,
        assignedTo: assignee || undefined,
        labels: labels.split(',').map(s => s.trim()).filter(Boolean),
      });
      const appended = original.endsWith('\n') ? original : original + '\n';
      const updated = appended + `- [ ] ${contentLine}\n`;
      await window.api.vault.writeFile(note.path, updated);
      setText('');
      setDue('');
      setPriority(0);
      setAssignee('');
      setLabels('');
      await loadTasks();
    } catch (e) {
      console.error(e);
      alert('Failed to quick-capture task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={targetNoteId}
        onChange={(e) => setTargetNoteId(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1"
      >
        {notes.map(n => (
          <option key={n.id} value={n.id}>{n.title}</option>
        ))}
      </select>
      <input
        placeholder="Quick task..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 min-w-[160px] flex-1"
      />
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 w-[140px]"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(parseInt(e.target.value, 10))}
        className="text-sm border border-gray-300 rounded px-2 py-1 w-[80px]"
      >
        <option value={0}>P-</option>
        <option value={1}>P1</option>
        <option value={2}>P2</option>
        <option value={3}>P3</option>
      </select>
      <input
        placeholder="@assignee"
        value={assignee}
        onChange={(e) => setAssignee(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 w-[140px]"
      />
      <input
        placeholder="labels (comma)"
        value={labels}
        onChange={(e) => setLabels(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 w-[160px]"
      />
      <button
        onClick={handleAdd}
        disabled={saving}
        className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        <FiPlus /> Add
      </button>
    </div>
  );
}


