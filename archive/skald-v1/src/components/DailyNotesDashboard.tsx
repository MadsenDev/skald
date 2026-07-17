import { useEffect, useState, useMemo } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { Task } from '../store/taskStore';
import { FiFileText, FiCheckSquare, FiCalendar, FiLink, FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface DailyNotesDashboardProps {
  onSelectNote: (path: string) => void;
  onSelectTask?: (task: Task) => void;
}

export function DailyNotesDashboard({ onSelectNote, onSelectTask }: DailyNotesDashboardProps) {
  const { notes } = useVaultStore();
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [recentNotes, setRecentNotes] = useState<Array<{ id: string; path: string; title: string; updatedAt: Date }>>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Get today's date range
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Get next 7 days for calendar
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [today]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch all tasks
        const fetchedTasks = await window.api.task.list();
        setAllTasks(fetchedTasks);
        
        // Filter tasks due today or overdue
        const todayTasksList = fetchedTasks.filter((task: Task) => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate <= today && (task.status === 'open' || task.status === 'in-progress');
        }).sort((a: Task, b: Task) => {
          // Sort by due date, then priority
          if (a.dueDate && b.dueDate) {
            return a.dueDate - b.dueDate;
          }
          return (b.priority || 0) - (a.priority || 0);
        });

        setTodayTasks(todayTasksList);

        // Get recently modified notes (last 10, sorted by updatedAt)
        const sortedNotes = [...notes].sort((a, b) => {
          const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
          const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
          return bTime - aTime;
        }).slice(0, 10);

        setRecentNotes(sortedNotes);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [notes]);

  const handleTaskClick = async (task: Task) => {
    if (onSelectTask) {
      onSelectTask(task);
    } else {
      // Find the note and open it
      const note = notes.find(n => n.id === task.noteId);
      if (note) {
        onSelectNote(note.path);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const getTasksForDate = useMemo(() => {
    return (date: Date) => {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      return allTasks.filter((task: Task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= dateStart && dueDate <= dateEnd;
      });
    };
  }, [allTasks]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--theme-text-tertiary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: 'var(--theme-accent)' }}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--theme-bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            Daily Notes
          </h1>
          <p className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-2"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid var(--theme-border-primary)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FiCheckSquare size={20} style={{ color: 'var(--theme-accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Today's Tasks
              </h2>
              {todayTasks.length > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-accent) 20%, var(--theme-bg-secondary))',
                    color: 'var(--theme-accent)',
                  }}
                >
                  {todayTasks.length}
                </span>
              )}
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--theme-text-tertiary)' }}>
                <FiCheckSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks due today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < today.getTime();
                  const note = notes.find(n => n.id === task.noteId);
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="w-full text-left p-3 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-primary)',
                        border: '1px solid var(--theme-border-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-bg-primary)';
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded font-medium"
                              style={{
                                backgroundColor: task.status === 'done'
                                  ? 'color-mix(in srgb, var(--theme-success) 20%, var(--theme-bg-primary))'
                                  : task.status === 'in-progress'
                                  ? 'color-mix(in srgb, var(--theme-info) 20%, var(--theme-bg-primary))'
                                  : 'color-mix(in srgb, var(--theme-warning) 20%, var(--theme-bg-primary))',
                                color: task.status === 'done'
                                  ? 'var(--theme-success)'
                                  : task.status === 'in-progress'
                                  ? 'var(--theme-info)'
                                  : 'var(--theme-warning)',
                              }}
                            >
                              {task.status}
                            </span>
                            {isOverdue && (
                              <span
                                className="text-xs px-2 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--theme-error) 20%, var(--theme-bg-primary))',
                                  color: 'var(--theme-error)',
                                }}
                              >
                                Overdue
                              </span>
                            )}
                            {task.priority && task.priority > 0 && (
                              <span
                                className="text-xs px-2 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: task.priority >= 3
                                    ? 'color-mix(in srgb, var(--theme-error) 20%, var(--theme-bg-primary))'
                                    : task.priority === 2
                                    ? 'color-mix(in srgb, var(--theme-warning) 20%, var(--theme-bg-primary))'
                                    : 'color-mix(in srgb, var(--theme-info) 20%, var(--theme-bg-primary))',
                                  color: task.priority >= 3
                                    ? 'var(--theme-error)'
                                    : task.priority === 2
                                    ? 'var(--theme-warning)'
                                    : 'var(--theme-info)',
                                }}
                              >
                                P{task.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                            {task.content}
                          </p>
                          {note && (
                            <p className="text-xs truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
                              {note.title || note.path}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Calendar - Next 7 Days */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid var(--theme-border-primary)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar size={20} style={{ color: 'var(--theme-accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Next 7 Days
              </h2>
            </div>
            <div className="space-y-2">
              {next7Days.map((date, index) => {
                const tasksForDate = getTasksForDate(date);
                const taskCount = tasksForDate.length;

                return (
                  <div
                    key={index}
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isToday(date) ? 'color-mix(in srgb, var(--theme-accent) 10%, var(--theme-bg-primary))' : 'var(--theme-bg-primary)',
                      border: isToday(date) ? '1px solid var(--theme-accent)' : '1px solid var(--theme-border-primary)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                          {formatDate(date)}
                        </p>
                        {taskCount > 0 && (
                          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-secondary)' }}>
                            {taskCount} task{taskCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {isToday(date) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}>
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recently Modified Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="lg:col-span-2"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              border: '1px solid var(--theme-border-primary)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FiClock size={20} style={{ color: 'var(--theme-accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                Recently Modified
              </h2>
            </div>
            {recentNotes.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--theme-text-tertiary)' }}>
                <FiFileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => {
                  const updatedAt = note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt);
                  const timeAgo = getTimeAgo(updatedAt);
                  
                  return (
                    <button
                      key={note.id}
                      onClick={() => onSelectNote(note.path)}
                      className="w-full text-left p-3 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--theme-bg-primary)',
                        border: '1px solid var(--theme-border-primary)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-bg-primary)';
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                            {note.title || note.path}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--theme-text-tertiary)' }}>
                            {note.path}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>
                          {timeAgo}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

