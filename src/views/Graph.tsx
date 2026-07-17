import { useMemo, useRef, useState } from 'react';
import type { GraphNode, VaultSnapshot } from '../../src-shared/types';
import { Rune, schemaTone } from '../ui/runes';
import { api } from '../api';
import { useStore, relTime } from '../store';

const W = 1200;
const H = 720;

export function ConstellationView({ snapshot }: { snapshot: VaultSnapshot }) {
  const openNote = useStore((s) => s.openNote);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(
    () =>
      [...snapshot.graph.nodes].sort((a, b) => b.deg - a.deg)[0]?.path ?? null
  );
  const [filter, setFilter] = useState<string>('All');
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ path: string; moved: boolean } | null>(null);
  // local position overrides during/after drag, until snapshot catches up
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({});

  const schemasPresent = useMemo(() => {
    const set = new Map<string, number>();
    for (const n of snapshot.graph.nodes) set.set(n.schema, (set.get(n.schema) ?? 0) + 1);
    return [...set.keys()];
  }, [snapshot.graph.nodes]);

  const nodes = useMemo(() => {
    const list = snapshot.graph.nodes.map((n) => ({
      ...n,
      ...(localPos[n.path] ?? {}),
    }));
    return filter === 'All' ? list : list.filter((n) => n.schema === filter);
  }, [snapshot.graph.nodes, filter, localPos]);

  const visible = useMemo(() => new Set(nodes.map((n) => n.path)), [nodes]);
  const nodeIndex = useMemo(() => new Map(nodes.map((n) => [n.path, n])), [nodes]);
  const edges = snapshot.graph.edges.filter(([a, b]) => visible.has(a) && visible.has(b));

  // clusters: top-level folders with at least 2 visible notes
  const clusters = useMemo(() => {
    const byFolder = new Map<string, GraphNode[]>();
    for (const n of nodes) {
      if (!n.folder) continue;
      (byFolder.get(n.folder) ?? byFolder.set(n.folder, []).get(n.folder)!).push(n);
    }
    return [...byFolder.entries()].filter(([, ns]) => ns.length >= 2);
  }, [nodes]);

  const activeNode = nodeIndex.get(hover ?? selected ?? '') ?? null;

  const toNorm = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    // svg preserves aspect ratio (xMidYMid meet): compute the drawn viewport
    const scale = Math.min(rect.width / W, rect.height / H);
    const ox = (rect.width - W * scale) / 2;
    const oy = (rect.height - H * scale) / 2;
    const x = (e.clientX - rect.left - ox) / (W * scale);
    const y = (e.clientY - rect.top - oy) / (H * scale);
    return { x: Math.max(0.02, Math.min(0.98, x)), y: Math.max(0.02, Math.min(0.98, y)) };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toNorm(e);
    if (!p) return;
    drag.current.moved = true;
    setLocalPos((lp) => ({ ...lp, [drag.current!.path]: p }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      const p = localPos[d.path] ?? toNorm(e);
      if (p) void api.setGraphPosition(d.path, p.x, p.y);
    }
  };

  return (
    <div className="constellation">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <radialGradient id="halo" r="0.5">
            <stop offset="0" stopColor="var(--ac)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--ac)" stopOpacity="0" />
          </radialGradient>
          <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0 H0 V44" fill="none" stroke="var(--tx-0)" strokeWidth="0.5" opacity="0.03" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#grid)" />

        {clusters.map(([name, ns]) => {
          const xs = ns.map((n) => n.x);
          const ys = ns.map((n) => n.y);
          const minX = Math.min(...xs) - 0.045;
          const maxX = Math.max(...xs) + 0.045;
          const minY = Math.min(...ys) - 0.05;
          const maxY = Math.max(...ys) + 0.045;
          const cx = (minX + maxX) / 2;
          return (
            <g key={name}>
              <rect
                x={minX * W}
                y={minY * H}
                width={(maxX - minX) * W}
                height={(maxY - minY) * H}
                rx="16"
                fill="none"
                stroke="var(--ac)"
                strokeDasharray="2 7"
                opacity="0.2"
              />
              <text
                x={cx * W}
                y={minY * H - 8}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="12"
                fill="var(--tx-3)"
                letterSpacing="0.16em"
              >
                {name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {edges.map(([a, b], i) => {
          const na = nodeIndex.get(a)!;
          const nb = nodeIndex.get(b)!;
          const act = [selected, hover].some((s) => s === a || s === b);
          return (
            <line
              key={i}
              x1={na.x * W}
              y1={na.y * H}
              x2={nb.x * W}
              y2={nb.y * H}
              stroke={act ? 'var(--ac)' : 'var(--tx-0)'}
              strokeOpacity={act ? 0.7 : 0.12}
              strokeWidth={act ? 1.3 : 0.8}
            />
          );
        })}

        {nodes.map((n) => {
          const r = 3 + Math.sqrt(n.deg + 1) * 2.3;
          const act = selected === n.path || hover === n.path;
          const col = schemaTone(n.schema);
          return (
            <g
              key={n.path}
              className="node"
              onMouseEnter={() => setHover(n.path)}
              onMouseLeave={() => setHover((h) => (h === n.path ? null : h))}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                drag.current = { path: n.path, moved: false };
              }}
              onClick={() => {
                if (drag.current?.moved) return;
                setSelected(n.path);
              }}
              onDoubleClick={() => openNote(n.path)}
            >
              {act && <circle cx={n.x * W} cy={n.y * H} r={r * 4} fill="url(#halo)" />}
              <circle cx={n.x * W} cy={n.y * H} r={r} fill={col} stroke="var(--bg-2)" strokeWidth="2" />
              <text
                x={n.x * W}
                y={n.y * H + r + 15}
                textAnchor="middle"
                fontFamily="var(--font-ui)"
                fontSize={act || n.deg >= 4 ? '13' : '11.5'}
                fill={act ? 'var(--tx-0)' : 'var(--tx-3)'}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {nodes.length === 0 && (
        <div className="constellation__empty">No stars yet — write some notes and link them.</div>
      )}

      <div className="constellation__bar">
        <button className="btn" aria-selected={filter === 'All'} onClick={() => setFilter('All')}>
          All
        </button>
        {schemasPresent.slice(0, 4).map((s) => (
          <button key={s} className="btn" aria-selected={filter === s} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
        <button
          className="btn"
          title="Recompute the layout from scratch"
          onClick={() => {
            setLocalPos({});
            void api.resetGraphLayout();
          }}
        >
          ↺
        </button>
      </div>

      <div className="constellation__legend">
        <div className="ttl">Schemas</div>
        {schemasPresent.map((s) => (
          <div key={s} className="row">
            <span className="sw" style={{ color: schemaTone(s) }}>
              <Rune schema={s} size={14} />
            </span>{' '}
            {s}
          </div>
        ))}
      </div>

      {activeNode && (
        <div className="constellation__inspector">
          <div className="eyebrow">
            <span style={{ color: schemaTone(activeNode.schema), display: 'inline-flex' }}>
              <Rune schema={activeNode.schema} size={13} />
            </span>{' '}
            {activeNode.schema}
          </div>
          <div className="name">{activeNode.label}</div>
          <div className="desc">
            {snapshot.notes.find((n) => n.path === activeNode.path)?.excerpt ||
              `A ${activeNode.schema.toLowerCase()} in the vault, linked to ${activeNode.deg} other ${activeNode.deg === 1 ? 'note' : 'notes'}.`}
          </div>
          <div className="row">
            <span>links</span>
            <span className="v">{activeNode.deg}</span>
          </div>
          <div className="row">
            <span>last edit</span>
            <span className="v">{relTime(activeNode.updated)} ago</span>
          </div>
          <div className="row">
            <span>cluster</span>
            <span className="v">{activeNode.folder || '—'}</span>
          </div>
          <div className="row" style={{ borderTop: 'none', paddingTop: 8 }}>
            <button className="btn btn--accent" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openNote(activeNode.path)}>
              Open note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
