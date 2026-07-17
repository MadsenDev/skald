import { getDatabase, saveDatabase } from './index.js';

export interface Task {
  id: string;
  noteId: string;
  lineAnchor: string;
  content: string;
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: number;
  dueDate: number | null; // timestamp
  assignedTo: string | null;
  labels: string[];
  order?: number;
  createdAt: number;
  updatedAt: number;
}

export async function insertTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
  const database = getDatabase();
  const id = task.id || crypto.randomUUID();
  const now = Date.now();
  
  const taskRecord: Task = {
    id,
    noteId: task.noteId,
    lineAnchor: task.lineAnchor,
    content: task.content,
    status: task.status,
    priority: task.priority || 0,
    dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
    assignedTo: task.assignedTo || null,
    labels: task.labels || [],
    order: task.order ?? computeNextOrderForStatus(task.status),
    updatedAt: now,
    createdAt: now,
  };
  
  database.tasks.set(id, taskRecord);
  saveDatabase();
  return id;
}

export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
  const database = getDatabase();
  const task = database.tasks.get(id);
  
  if (!task) {
    throw new Error(`Task ${id} not found`);
  }
  
  const updated: Task = {
    ...task,
    ...updates,
    dueDate: updates.dueDate !== undefined 
      ? (updates.dueDate ? new Date(updates.dueDate).getTime() : null)
      : task.dueDate,
    // if status changed and order not provided, put at end of new column
    order: updates.status && updates.status !== task.status
      ? (updates.order ?? computeNextOrderForStatus(updates.status))
      : (updates.order !== undefined ? updates.order : task.order),
    updatedAt: Date.now(),
  };
  
  database.tasks.set(id, updated);
  saveDatabase();
}

export async function getTask(id: string): Promise<Task | null> {
  const database = getDatabase();
  return database.tasks.get(id) || null;
}

export async function getTasksByNote(noteId: string): Promise<Task[]> {
  const database = getDatabase();
  return Array.from(database.tasks.values())
    .filter(task => task.noteId === noteId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getTaskByNoteAndLine(noteId: string, lineAnchor: string): Promise<Task | null> {
  const database = getDatabase();
  for (const task of database.tasks.values()) {
    if (task.noteId === noteId && task.lineAnchor === lineAnchor) {
      return task;
    }
  }
  return null;
}

export async function getAllTasks(filters?: {
  status?: Task['status'];
  noteId?: string;
  assignedTo?: string;
  labels?: string[];
}): Promise<Task[]> {
  const database = getDatabase();
  let tasks = Array.from(database.tasks.values());
  
  if (filters) {
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters.noteId) {
      tasks = tasks.filter(t => t.noteId === filters.noteId);
    }
    if (filters.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
    }
    if (filters.labels && filters.labels.length > 0) {
      tasks = tasks.filter(t => 
        filters.labels!.some(label => t.labels.includes(label))
      );
    }
  }
  
  return tasks.sort((a, b) => {
    // Default sort: by order if both defined and statuses equal; else by priority/due/created
    if (a.status === b.status) {
      if (a.order !== undefined && b.order !== undefined) {
        return (a.order - b.order);
      }
    }
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  });
}

export async function deleteTask(id: string): Promise<void> {
  const database = getDatabase();
  database.tasks.delete(id);
  saveDatabase();
}

export async function deleteTasksByNote(noteId: string): Promise<void> {
  const database = getDatabase();
  for (const [id, task] of database.tasks.entries()) {
    if (task.noteId === noteId) {
      database.tasks.delete(id);
    }
  }
  saveDatabase();
}

function computeNextOrderForStatus(status: Task['status']): number {
  const database = getDatabase();
  let max = -1;
  for (const t of database.tasks.values()) {
    if (t.status === status && typeof t.order === 'number') {
      if (t.order! > max) max = t.order!;
    }
  }
  return max + 1;
}

export async function reorderTasksByStatus(status: Task['status'], orderedIds: string[]): Promise<void> {
  const database = getDatabase();
  // Assign new order based on orderedIds; tasks not in list keep their order after listed ones
  let order = 0;
  const setIdToOrder = new Map<string, number>();
  for (const id of orderedIds) {
    setIdToOrder.set(id, order++);
  }
  for (const [id, t] of database.tasks.entries()) {
    if (t.status !== status) continue;
    if (setIdToOrder.has(id)) {
      t.order = setIdToOrder.get(id);
    } else if (t.order === undefined) {
      t.order = order++;
    }
    database.tasks.set(id, { ...t, updatedAt: Date.now() });
  }
  saveDatabase();
}

