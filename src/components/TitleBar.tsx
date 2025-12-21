import { useState, useEffect } from 'react';
import { FiMinimize2, FiMaximize2, FiX, FiMinus, FiSquare, FiSettings } from 'react-icons/fi';
import { useSettingsStore } from '../store/settingsStore';
import { useVaultStore } from '../store/vaultStore';
import { getDefaultTheme } from '../themes/themes';
import { loadTheme } from '../themes/themeLoader';
import { motion } from 'framer-motion';
import { Logo } from './Logo';

interface TitleBarProps {
  onSettingsClick?: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  const settings = useSettingsStore((state) => state.settings);
  const themeId = settings.appearance?.theme ?? 'light';
  const { notes } = useVaultStore();
  const [theme, setTheme] = useState<any>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentNotePath, setCurrentNotePath] = useState<string | null>(null);

  // Listen for note navigation events
  useEffect(() => {
    const handleNoteNavigation = (e: CustomEvent) => {
      setCurrentNotePath(e.detail.path);
    };

    window.addEventListener('navigate-to-note', handleNoteNavigation as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-note', handleNoteNavigation as EventListener);
    };
  }, []);

  // Load theme when themeId changes
  useEffect(() => {
    loadTheme(themeId).then(loadedTheme => {
      if (loadedTheme) {
        setTheme(loadedTheme);
      } else {
        // Fallback to default
        loadTheme(getDefaultTheme().id).then(defaultTheme => {
          if (defaultTheme) setTheme(defaultTheme);
        });
      }
    });
  }, [themeId]);

  // Check window state on mount and listen for changes
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.api.window.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check window state:', error);
      }
    };
    
    checkMaximized();
    
    // Listen for maximize/unmaximize events
    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);
    
    window.addEventListener('maximize', handleMaximize);
    window.addEventListener('unmaximize', handleUnmaximize);
    
    return () => {
      window.removeEventListener('maximize', handleMaximize);
      window.removeEventListener('unmaximize', handleUnmaximize);
    };
  }, []);

  const handleMinimize = () => {
    window.api.window.minimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await window.api.window.unmaximize();
      setIsMaximized(false);
    } else {
      await window.api.window.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    window.api.window.close();
  };

  if (!theme) {
    return null; // Don't render until theme is loaded
  }

  const getNoteTitle = () => {
    if (!currentNotePath) return null;
    const note = notes.find(n => n.path === currentNotePath);
    return note?.title || currentNotePath.split('/').pop() || currentNotePath;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-9 flex items-center justify-between select-none border-b relative overflow-hidden"
      style={{
        backgroundColor: theme.colors.bgPrimary,
        color: theme.colors.textPrimary,
        borderColor: theme.colors.borderPrimary,
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: `linear-gradient(to bottom, ${theme.colors.bgSecondary}, transparent)`,
        }}
      />

      {/* Left side - App branding and current note */}
      <div className="flex items-center gap-3 px-4 flex-1 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="p-1.5 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: `color-mix(in srgb, ${theme.colors.accent} 15%, ${theme.colors.bgPrimary})`,
              color: theme.colors.accent,
            }}
          >
            <Logo size={16} />
          </div>
          <span className="text-sm font-bold" style={{ color: theme.colors.textPrimary }}>
            Skald
          </span>
        </div>

        {/* Current note path */}
        {currentNotePath && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 min-w-0 flex-1"
          >
            <div
              className="h-4 w-px flex-shrink-0"
              style={{ backgroundColor: theme.colors.borderPrimary }}
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-xs truncate"
                style={{ color: theme.colors.textSecondary }}
                title={currentNotePath}
              >
                {getNoteTitle()}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right side - Settings and Window controls */}
      <div className="flex items-center flex-shrink-0 gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
            style={{
              color: theme.colors.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.hover;
              e.currentTarget.style.color = theme.colors.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.textSecondary;
            }}
            title="Settings"
          >
            <FiSettings className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleMinimize}
          className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
          style={{
            color: theme.colors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.hover;
            e.currentTarget.style.color = theme.colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.textSecondary;
          }}
          title="Minimize"
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
          style={{
            color: theme.colors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.hover;
            e.currentTarget.style.color = theme.colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.textSecondary;
          }}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <FiMaximize2 className="w-3.5 h-3.5" />
          ) : (
            <FiSquare className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
          style={{
            color: theme.colors.textSecondary,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.error;
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.textSecondary;
          }}
          title="Close"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
