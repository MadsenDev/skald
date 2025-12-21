import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners after a short delay to avoid immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  useEffect(() => {
    if (!position || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust position if menu would overflow viewport
    let adjustedX = position.x;
    let adjustedY = position.y;

    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }
    if (adjustedX < 10) adjustedX = 10;
    if (adjustedY < 10) adjustedY = 10;

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [position]);

  if (!position) return null;

  const visibleItems = items.filter((item) => !item.separator);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed z-[10000] min-w-[180px] rounded-lg shadow-xl border py-1"
        style={{
          backgroundColor: 'var(--theme-bg-primary)',
          borderColor: 'var(--theme-border-primary)',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return (
              <div
                key={`separator-${index}`}
                className="my-1 h-px"
                style={{ backgroundColor: 'var(--theme-border-primary)' }}
              />
            );
          }

          const isDisabled = item.disabled ?? false;

          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled && item.onClick) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={isDisabled}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : item.danger
                  ? 'hover:bg-red-50'
                  : 'hover:bg-gray-100'
              }`}
              style={{
                color: isDisabled
                  ? 'var(--theme-text-tertiary)'
                  : item.danger
                  ? 'var(--theme-error)'
                  : 'var(--theme-text-primary)',
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.backgroundColor = item.danger
                    ? 'var(--theme-error)'
                    : 'var(--theme-hover)';
                  if (item.danger) {
                    e.currentTarget.style.color = 'var(--theme-accent-text)';
                  }
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                if (item.danger) {
                  e.currentTarget.style.color = 'var(--theme-error)';
                }
              }}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

