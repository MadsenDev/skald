import { create } from 'zustand';

export interface Task {
  id: string;
  noteId: string;
  lineAnchor: string;
  content: string;
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: number;
  dueDate: number | null;
  assignedTo: string | null;
  labels: string[];
  createdAt: number;
  updatedAt: number;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  filters: {
    status?: Task['status'];
    noteId?: string;
    assignedTo?: string;
    labels?: string[];
  };
  loadTasks: (filters?: TaskState['filters']) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setFilters: (filters: TaskState['filters']) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  filters: {},

  loadTasks: async (filters) => {
    set({ loading: true });
    try {
      const taskFilters = filters || get().filters;
      const tasks = await window.api.task.list(taskFilters);
      set({ tasks, filters: taskFilters });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    try {
      await window.api.task.update(id, updates);
      await get().loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    try {
      await window.api.task.delete(id);
      await get().loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  },

  setFilters: (filters) => {
    set({ filters });
    get().loadTasks(filters);
  },
}));

