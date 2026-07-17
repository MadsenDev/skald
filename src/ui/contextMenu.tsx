import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export interface CtxItem {
  label: string;
  icon?: string;
  danger?: boolean;
  sep?: boolean;
  onClick?: () => void;
}

export interface CtxState {
  x: number;
  y: number;
  items: CtxItem[];
}

export function useContextMenu() {
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const open = (e: React.MouseEvent, items: CtxItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, items });
  };
  const close = () => setCtx(null);
  return { ctx, open, close };
}

export function ContextMenu({ ctx, onClose }: { ctx: CtxState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: ctx.x, y: ctx.y });

  useEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({
        x: Math.min(ctx.x, window.innerWidth - r.width - 8),
        y: Math.min(ctx.y, window.innerHeight - r.height - 8),
      });
    }
    const down = () => onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key);
    };
  }, [ctx, onClose]);

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {ctx.items.map((it, i) =>
        it.sep ? (
          <div key={i} className="sep" />
        ) : (
          <button
            key={i}
            className={it.danger ? 'danger' : undefined}
            onClick={() => {
              onClose();
              it.onClick?.();
            }}
          >
            {it.icon && <Icon name={it.icon} size={14} />}
            {it.label}
          </button>
        )
      )}
    </div>
  );
}
