import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { FiX, FiSettings, FiEdit3, FiSun, FiColumns, FiEye, FiCalendar } from 'react-icons/fi';
import { getThemesByCategory } from '../themes/themes';
import { applyThemeFromFile } from '../themes/themeLoader';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'editor' | 'appearance' | 'preview' | 'calendar' | 'kanban';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { loading, loadSettings, setSetting } = useSettingsStore();
  const settings = useSettingsStore((state) => state.settings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('editor');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);


  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Editor', icon: <FiEdit3 /> },
    { id: 'appearance', label: 'Appearance', icon: <FiSun /> },
    { id: 'preview', label: 'Preview', icon: <FiEye /> },
    { id: 'calendar', label: 'Calendar', icon: <FiCalendar /> },
    { id: 'kanban', label: 'Kanban', icon: <FiColumns /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
              border: '1px solid var(--theme-border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: 'var(--theme-border-primary)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 15%, var(--theme-bg-primary))' }}
                >
                  <FiSettings
                    className="w-5 h-5"
                    style={{ color: 'var(--theme-accent)' }}
                  />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    Settings
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--theme-text-tertiary)' }}
                  >
                    Customize your Skald experience
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--theme-text-tertiary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                  e.currentTarget.style.color = 'var(--theme-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--theme-text-tertiary)';
                }}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div
                className="w-56 border-r p-4"
                style={{
                  borderColor: 'var(--theme-border-primary)',
                  backgroundColor: 'var(--theme-bg-secondary)',
                }}
              >
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-all relative group"
                      style={{
                        color: activeSection === section.id
                          ? 'var(--theme-accent)'
                          : 'var(--theme-text-secondary)',
                        backgroundColor: activeSection === section.id
                          ? 'color-mix(in srgb, var(--theme-accent) 12%, var(--theme-bg-primary))'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (activeSection !== section.id) {
                          e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeSection !== section.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {activeSection === section.id && (
                        <motion.div
                          layoutId="activeSection"
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                          style={{ backgroundColor: 'var(--theme-accent)' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <span
                        className="flex-shrink-0"
                        style={{
                          color: activeSection === section.id
                            ? 'var(--theme-accent)'
                            : 'var(--theme-text-secondary)',
                        }}
                      >
                        {section.icon}
                      </span>
                      <span
                        className="font-medium text-sm"
                        style={{
                          color: activeSection === section.id
                            ? 'var(--theme-text-primary)'
                            : 'var(--theme-text-secondary)',
                        }}
                      >
                        {section.label}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Main Content */}
              <div
                className="flex-1 overflow-y-auto"
                style={{ backgroundColor: 'var(--theme-bg-primary)' }}
              >
                <div className="p-8 max-w-2xl">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div style={{ color: 'var(--theme-text-tertiary)' }}>
                        Loading settings...
                      </div>
                    </div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeSection === 'editor' && (
                          <EditorSettings settings={settings} setSetting={setSetting} />
                        )}
                        {activeSection === 'appearance' && (
                          <AppearanceSettings settings={settings} setSetting={setSetting} />
                        )}
                        {activeSection === 'preview' && (
                          <PreviewSettings settings={settings} setSetting={setSetting} />
                        )}
                        {activeSection === 'calendar' && (
                          <CalendarSettings settings={settings} setSetting={setSetting} />
                        )}
                        {activeSection === 'kanban' && (
                          <KanbanSettings settings={settings} setSetting={setSetting} />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EditorSettings({
  settings,
  setSetting,
}: {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}) {
  const editorSettings = settings.editor || {};

  return (
    <div className="space-y-8">
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Editor Settings
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Customize the Markdown editor appearance and behavior
        </p>
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Font Size
            </label>
            <input
              type="number"
              min="10"
              max="24"
              value={editorSettings.fontSize || 14}
              onChange={(e) => setSetting('editor.fontSize', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Font Family
            </label>
            <select
              value={editorSettings.fontFamily || 'monospace'}
              onChange={(e) => setSetting('editor.fontFamily', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="monospace">Monospace</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Consolas', monospace">Consolas</option>
              <option value="'Fira Code', monospace">Fira Code</option>
            </select>
          </div>

          <div className="space-y-4">
            <ToggleSetting
              label="Word Wrap"
              description="Wrap long lines in the editor"
              checked={editorSettings.wordWrap !== false}
              onChange={(checked) => setSetting('editor.wordWrap', checked)}
            />
            <ToggleSetting
              label="Line Numbers"
              description="Show line numbers in the editor"
              checked={editorSettings.lineNumbers !== false}
              onChange={(checked) => setSetting('editor.lineNumbers', checked)}
            />
            <ToggleSetting
              label="Minimap"
              description="Show code minimap on the right side"
              checked={editorSettings.minimap === true}
              onChange={(checked) => setSetting('editor.minimap', checked)}
            />
            <ToggleSetting
              label="Automatic Link Suggestions"
              description="Suggest linking to notes while typing (press Tab to accept)"
              checked={editorSettings.autoLinkSuggestions !== false}
              onChange={(checked) => setSetting('editor.autoLinkSuggestions', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings({
  settings,
  setSetting,
}: {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}) {
  const appearanceSettings = settings.appearance || {};
  const currentThemeId = appearanceSettings.theme || 'light';

  return (
    <div className="space-y-8">
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Appearance
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Choose a theme that matches your style
        </p>
        <div>
          <label
            className="block text-sm font-medium mb-4"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Theme
          </label>
          
          {/* Standard Themes */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>
              Standard
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getThemesByCategory('standard').map((theme) => (
                <ThemePreview
                  key={theme.id}
                  theme={theme}
                  isSelected={currentThemeId === theme.id}
                  onSelect={async () => {
                    await applyThemeFromFile(theme.id);
                    await setSetting('appearance.theme', theme.id);
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Drastic Themes */}
          {getThemesByCategory('drastic').length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--theme-text-tertiary)' }}>
                Drastic
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {getThemesByCategory('drastic').map((theme) => (
                  <ThemePreview
                    key={theme.id}
                    theme={theme}
                    isSelected={currentThemeId === theme.id}
                    onSelect={async () => {
                      await applyThemeFromFile(theme.id);
                      await setSetting('appearance.theme', theme.id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar Note Display */}
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Sidebar
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Customize how notes are displayed in the sidebar
        </p>
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Note Display
          </label>
          <select
            value={appearanceSettings.sidebarNoteDisplay || 'filename'}
            onChange={(e) => setSetting('appearance.sidebarNoteDisplay', e.target.value)}
            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: 'var(--theme-border-primary)',
              backgroundColor: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
              borderWidth: '1px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <option value="filename">Filename (without .md)</option>
            <option value="title">Title (from frontmatter/header)</option>
          </select>
          <p className="text-xs mt-2" style={{ color: 'var(--theme-text-tertiary)' }}>
            Choose whether to show the filename or the note title in the sidebar
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({
  theme,
  isSelected,
  onSelect,
}: {
  theme: { id: string; name: string; description?: string; category?: string };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [themeColors, setThemeColors] = useState<{ bgPrimary: string; bgSecondary: string; textPrimary: string; textSecondary: string } | null>(null);

  useEffect(() => {
    // Load theme colors for preview
    fetch(`/src/themes/themes/${theme.id}/theme.json`)
      .then(res => res.json())
      .then(config => {
        setThemeColors({
          bgPrimary: config.colors.bgPrimary,
          bgSecondary: config.colors.bgSecondary,
          textPrimary: config.colors.textPrimary,
          textSecondary: config.colors.textSecondary,
        });
      })
      .catch(() => {
        // Fallback colors
        setThemeColors({
          bgPrimary: '#ffffff',
          bgSecondary: '#f9fafb',
          textPrimary: '#111827',
          textSecondary: '#6b7280',
        });
      });
  }, [theme.id]);

  if (!themeColors) {
    return (
      <div className="theme-preview-card relative p-4 rounded-xl border-2 border-gray-200 bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="theme-preview-card relative p-4 rounded-xl border-2 transition-all text-left overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${themeColors.bgPrimary} 0%, ${themeColors.bgSecondary} 100%)`,
        color: themeColors.textPrimary,
        borderColor: isSelected ? 'var(--theme-accent)' : 'var(--theme-border-primary)',
        boxShadow: isSelected
          ? '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)'
          : 'none',
      }}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          <svg className="w-3 h-3" style={{ color: 'var(--theme-accent-text)' }} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: themeColors.textPrimary }}>
          {theme.name}
        </span>
      </div>
      {theme.description && (
        <p className="text-xs opacity-75 mb-3" style={{ color: themeColors.textSecondary }}>
          {theme.description}
        </p>
      )}
      <div className="flex gap-1.5">
        <div
          className="w-6 h-6 rounded border"
          style={{
            backgroundColor: themeColors.bgPrimary,
            borderColor: 'var(--theme-border-primary)',
          }}
          title="Primary"
        />
        <div
          className="w-6 h-6 rounded border"
          style={{
            backgroundColor: themeColors.bgSecondary,
            borderColor: 'var(--theme-border-primary)',
          }}
          title="Secondary"
        />
      </div>
    </motion.button>
  );
}

// Toggle Switch Component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <label
          className="block text-sm font-medium cursor-pointer"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          {label}
        </label>
        {description && (
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--theme-text-tertiary)' }}
          >
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
        style={{
          backgroundColor: checked ? 'var(--theme-accent)' : 'var(--theme-border-primary)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          style={{
            transform: checked ? 'translateX(1.25rem)' : 'translateX(0.25rem)',
          }}
        />
      </button>
    </div>
  );
}

function PreviewSettings({
  settings,
  setSetting,
}: {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}) {
  const previewSettings = settings.preview || {};
  const highlightThemes = [
    'github',
    'github-dark',
    'github-dark-dimmed',
    'default',
    'monokai',
    'vs2015',
    'xcode',
    'atom-one-light',
    'atom-one-dark',
    'dracula',
    'tomorrow',
    'tomorrow-night',
    'a11y-dark',
    'a11y-light',
    'agate',
    'androidstudio',
    'an-old-hope',
    'arduino-light',
    'arta',
    'ascetic',
    'dark',
    'devibeans',
    'foundation',
    'hybrid',
    'ir-black',
    'kimbie-dark',
    'kimbie-light',
    'magula',
    'nord',
    'obsidian',
    'paraiso-dark',
    'paraiso-light',
    'pojoaque',
    'purebasic',
    'qtcreator-dark',
    'qtcreator-light',
    'rainbow',
    'routeros',
    'school-book',
    'shades-of-purple',
    'srcery',
    'stackoverflow-dark',
    'stackoverflow-light',
    'sunburst',
    'tokyo-night-dark',
    'tokyo-night-light',
    'vscode-dark-plus',
    'vscode-light-plus',
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Preview Settings
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Customize how Markdown is rendered in preview mode
        </p>
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Code Block Theme
            </label>
            <select
              value={previewSettings.codeBlockTheme || 'github'}
              onChange={(e) => setSetting('preview.codeBlockTheme', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {highlightThemes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1).replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <ToggleSetting
            label="Line Numbers"
            description="Show line numbers in code blocks"
            checked={previewSettings.codeBlockLineNumbers === true}
            onChange={(checked) => setSetting('preview.codeBlockLineNumbers', checked)}
          />

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Code Block Font Size
            </label>
            <input
              type="number"
              min="10"
              max="24"
              value={previewSettings.codeBlockFontSize || 14}
              onChange={(e) => setSetting('preview.codeBlockFontSize', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Code Block Font Family
            </label>
            <select
              value={previewSettings.codeBlockFontFamily || 'monospace'}
              onChange={(e) => setSetting('preview.codeBlockFontFamily', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="monospace">Monospace</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Consolas', monospace">Consolas</option>
              <option value="'Fira Code', monospace">Fira Code</option>
              <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarSettings({
  settings,
  setSetting,
}: {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}) {
  const calendarSettings = settings.calendar || {};
  const firstDayOfWeek = calendarSettings.firstDayOfWeek ?? 0; // Default to Sunday

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Calendar Settings
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Configure how the calendar view displays
        </p>
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            First Day of Week
          </label>
          <select
            value={firstDayOfWeek}
            onChange={(e) => setSetting('calendar.firstDayOfWeek', parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: 'var(--theme-border-primary)',
              backgroundColor: 'var(--theme-bg-primary)',
              color: 'var(--theme-text-primary)',
              borderWidth: '1px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {dayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function KanbanSettings({
  settings,
  setSetting,
}: {
  settings: any;
  setSetting: (key: string, value: any) => Promise<void>;
}) {
  const kanbanSettings = settings.kanban || {};
  const wipLimits = kanbanSettings.wipLimits || {};

  const statuses: Array<{ key: keyof typeof wipLimits; label: string }> = [
    { key: 'open', label: 'Open' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--theme-text-primary)' }}
        >
          Kanban Settings
        </h3>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--theme-text-tertiary)' }}
        >
          Configure the Kanban board layout and limits
        </p>
        <div className="space-y-6">
          <div>
            <label
              className="block text-sm font-medium mb-3"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Work In Progress (WIP) Limits
            </label>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Set maximum number of tasks per column. Leave empty for no limit.
            </p>
            <div className="space-y-3">
              {statuses.map((status) => (
                <div
                  key={String(status.key)}
                  className="flex items-center justify-between py-2"
                >
                  <label
                    className="text-sm font-medium"
                    style={{ color: 'var(--theme-text-primary)' }}
                  >
                    {status.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wipLimits[status.key] || ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                      setSetting(`kanban.wipLimits.${String(status.key)}`, value);
                    }}
                    placeholder="No limit"
                    className="w-24 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all text-right"
                    style={{
                      borderColor: 'var(--theme-border-primary)',
                      backgroundColor: 'var(--theme-bg-primary)',
                      color: 'var(--theme-text-primary)',
                      borderWidth: '1px',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-accent)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Group By
            </label>
            <p
              className="text-xs mb-3"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              Organize tasks within columns by assignee or label
            </p>
            <select
              value={kanbanSettings.groupBy || 'none'}
              onChange={(e) => setSetting('kanban.groupBy', e.target.value)}
              className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all"
              style={{
                borderColor: 'var(--theme-border-primary)',
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--theme-accent) 20%, transparent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--theme-border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="none">None</option>
              <option value="assignee">Assignee</option>
              <option value="label">Label</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

