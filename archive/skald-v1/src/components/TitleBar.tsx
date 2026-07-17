import { useState, useEffect, CSSProperties } from 'react';
import { FiMaximize2, FiX, FiMinus, FiSquare, FiSettings } from 'react-icons/fi';
import { useVaultStore } from '../store/vaultStore';
import { motion } from 'framer-motion';
import { Logo } from './Logo';
import { useActiveTheme } from '../themes/useTheme';

interface TitleBarProps {
  onSettingsClick?: () => void;
}

export function TitleBar({ onSettingsClick }: TitleBarProps) {
  useActiveTheme();
  const { notes } = useVaultStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentNotePath, setCurrentNotePath] = useState<string | null>(null);
  const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties & { WebkitAppRegion: string };
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties & { WebkitAppRegion: string };

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
        backgroundColor: 'var(--theme-bg-shell)',
        color: 'var(--theme-text-primary)',
        borderColor: 'var(--theme-border-primary)',
        ...dragStyle,
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background: 'linear-gradient(to bottom, var(--theme-bg-panel), transparent)',
        }}
      />

      {/* Left side - App branding and current note */}
      <div className="flex items-center gap-3 px-4 flex-1 min-w-0" style={noDragStyle}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="p-1.5 rounded-md flex items-center justify-center"
            style={{
              backgroundColor: 'var(--theme-accent-soft)',
              color: 'var(--theme-accent)',
            }}
          >
            <Logo size={16} />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
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
              style={{ backgroundColor: 'var(--theme-border-primary)' }}
            />
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-xs truncate"
                style={{ color: 'var(--theme-text-secondary)' }}
                title={currentNotePath}
              >
                {getNoteTitle()}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right side - Settings and Window controls */}
      <div className="flex items-center flex-shrink-0 gap-1" style={noDragStyle}>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
            style={{
              color: 'var(--theme-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
              e.currentTarget.style.color = 'var(--theme-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text-secondary)';
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
              color: 'var(--theme-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
              e.currentTarget.style.color = 'var(--theme-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text-secondary)';
            }}
          title="Minimize"
        >
          <FiMinus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
            className="w-9 h-9 flex items-center justify-center transition-all duration-150 rounded-sm"
            style={{
              color: 'var(--theme-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-hover)';
              e.currentTarget.style.color = 'var(--theme-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text-secondary)';
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
              color: 'var(--theme-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-error)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text-secondary)';
            }}
          title="Close"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
