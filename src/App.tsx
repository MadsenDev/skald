import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { VaultSelector } from './components/VaultSelector';
import { LoadingScreen } from './components/LoadingScreen';
import { PinnedPreviewComponent } from './components/PinnedPreview';
import { usePinnedPreviewsStore } from './store/pinnedPreviewsStore';
import { NoteEditor } from './components/NoteEditor';
import { NoteList } from './components/NoteList';
import { TaskTableView } from './components/TaskTableView';
import { TaskKanbanView } from './components/TaskKanbanView';
import { TaskCalendarView } from './components/TaskCalendarView';
import { QuickSwitcher } from './components/QuickSwitcher';
import { DailyNotesDashboard } from './components/DailyNotesDashboard';
import { QuickCapture } from './components/QuickCapture';
import { TaskFilters } from './components/TaskFilters';
import { TitleBar } from './components/TitleBar';
import { AnimationLayer } from './components/AnimationLayer';
import { GlitchAnimation } from './components/GlitchAnimation';
import { useVaultStore } from './store/vaultStore';
import { useSettingsStore } from './store/settingsStore';
import { FiFileText, FiCheckSquare } from 'react-icons/fi';
import { SettingsModal } from './components/SettingsModal';
import { getDefaultTheme } from './themes/themes';
import { applyThemeFromFile } from './themes/themeLoader';

type View = 'notes' | 'tasks' | 'tasks-kanban' | 'tasks-calendar';

function App() {
  const { vaultPath, notes, loadVault, loadNotes } = useVaultStore();
  const { loadSettings } = useSettingsStore();
  const settings = useSettingsStore((state) => state.settings);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('notes');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [peekedNote, setPeekedNote] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { pinnedPreviews } = usePinnedPreviewsStore();

  // Load settings on mount and apply theme
  useEffect(() => {
    const initializeTheme = async () => {
      // Apply default theme immediately to avoid flash
      const defaultTheme = getDefaultTheme();
      await applyThemeFromFile(defaultTheme.id);
      
      // Load settings
      await loadSettings();
      
      // Get settings from store after loading
      const loadedSettings = useSettingsStore.getState().settings;
      const savedThemeId = loadedSettings.appearance?.theme;
      if (savedThemeId) {
        await applyThemeFromFile(savedThemeId);
      }
      
      // Mark initialization as complete
      setIsInitializing(false);
    };
    
    initializeTheme();
  }, []); // Only run on mount

  // Apply theme when settings change (for reactive updates)
  const themeId = settings.appearance?.theme ?? 'light';
  useEffect(() => {
    applyThemeFromFile(themeId).catch(err => {
      console.error('Failed to apply theme:', err);
      // Fallback to default
      applyThemeFromFile(getDefaultTheme().id);
    });
  }, [themeId]);

  useEffect(() => {
    if (vaultPath) {
      loadNotes();
    }
  }, [vaultPath, loadNotes]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + P for Quick Switcher
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
      // Ctrl/Cmd + K for Quick Switcher (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Listen for navigate-to-note events from wikilinks
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>;
      if (customEvent.detail?.path) {
        console.log('Navigating to note:', customEvent.detail.path);
        setSelectedNote(customEvent.detail.path);
        setCurrentView('notes');
      }
    };

    const handlePeek = (e: Event) => {
      const customEvent = e as CustomEvent<{ path: string }>;
      if (customEvent.detail?.path) {
        console.log('Peeking at note:', customEvent.detail.path);
        setPeekedNote(customEvent.detail.path);
      }
    };

    window.addEventListener('navigate-to-note', handleNavigate);
    window.addEventListener('peek-note', handlePeek);
    return () => {
      window.removeEventListener('navigate-to-note', handleNavigate);
      window.removeEventListener('peek-note', handlePeek);
    };
  }, []);

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  // Show vault selector if no vault is selected
  if (!vaultPath) {
    return <VaultSelector onSelect={loadVault} />;
  }

  const handleSearchResultClick = (result: { type: 'note' | 'task'; path?: string; noteId?: string }) => {
    if (result.type === 'note' && result.path) {
      setSelectedNote(result.path);
      setCurrentView('notes');
    } else if (result.type === 'task' && result.noteId) {
      // Find the note path from the note ID
      const note = notes.find(n => n.id === result.noteId);
      if (note) {
        setSelectedNote(note.path);
        setCurrentView('notes');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" style={{ position: 'relative', zIndex: 10 }}>
      <AnimationLayer />
      {settings.appearance?.theme === 'glitch' && <GlitchAnimation />}
      <TitleBar onSettingsClick={() => setIsSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 flex flex-col" style={{ backgroundColor: 'var(--theme-bg-primary)', borderRight: '1px solid var(--theme-border-primary)' }}>
        <div className="flex" style={{ borderBottom: '1px solid var(--theme-border-primary)' }}>
          <button
            onClick={() => setCurrentView('notes')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              currentView === 'notes'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiFileText />
            Notes
          </button>
          <button
            onClick={() => setCurrentView('tasks')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              currentView === 'tasks'
                ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FiCheckSquare />
            Tasks
          </button>
        </div>
        {currentView === 'notes' && (
          <NoteList
            notes={notes}
            selectedNote={selectedNote}
            onSelectNote={setSelectedNote}
          />
        )}
      </aside>
      <main className="flex-1 flex flex-col">
        {currentView === 'notes' ? (
          selectedNote ? (
            <NoteEditor notePath={selectedNote} onClose={() => setSelectedNote(null)} />
          ) : (
            <DailyNotesDashboard onSelectNote={setSelectedNote} />
          )
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="border-b border-gray-200 px-4 py-2 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('tasks')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Table
                </button>
                <button
                  onClick={() => setCurrentView('tasks-kanban')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Kanban
                </button>
                <button
                  onClick={() => setCurrentView('tasks-calendar')}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Calendar
                </button>
              </div>
              <div className="hidden lg:block max-w-full overflow-x-auto">
                <QuickCapture />
              </div>
              <div className="hidden md:block">
                <TaskFilters />
              </div>
            </div>
            {currentView === 'tasks' ? (
              <TaskTableView />
            ) : currentView === 'tasks-kanban' ? (
              <TaskKanbanView />
            ) : (
              <TaskCalendarView />
            )}
          </div>
        )}
      </main>
      </div>
      {/* Peek Panel */}
      <AnimatePresence>
        {peekedNote && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-1/2 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">
                {notes.find(n => n.path === peekedNote)?.title || 'Peek'}
              </h2>
              <button
                onClick={() => setPeekedNote(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <NoteEditor notePath={peekedNote} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Pinned Previews */}
      <AnimatePresence>
        {pinnedPreviews.map((preview) => (
          <PinnedPreviewComponent key={preview.id} preview={preview} />
        ))}
      </AnimatePresence>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelect={handleSearchResultClick}
      />
    </div>
  );
}

export default App;

