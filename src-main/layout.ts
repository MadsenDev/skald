// Stable graph layout. Positions are normalized to [0.05, 0.95] and persisted,
// so the constellation is a place you return to, not a simulation that
// re-renders on every open. Only nodes without a stored position are laid out;
// stored nodes act as fixed anchors.

export interface LayoutNode {
  id: string;
  fixed: boolean;
  x: number;
  y: number;
}

/** Deterministic hash → [0,1) */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function layoutGraph(
  ids: string[],
  edges: [string, string][],
  stored: Record<string, { x: number; y: number }>
): Record<string, { x: number; y: number }> {
  const nodes: LayoutNode[] = ids.map((id) => {
    const p = stored[id];
    if (p && isFinite(p.x) && isFinite(p.y)) {
      return { id, fixed: true, x: clamp01(p.x), y: clamp01(p.y) };
    }
    return {
      id,
      fixed: false,
      x: 0.15 + 0.7 * hash01(id, 7),
      y: 0.15 + 0.7 * hash01(id, 131),
    };
  });

  const hasNew = nodes.some((n) => !n.fixed);
  if (!hasNew) return positionsOf(nodes);

  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const adj: [number, number][] = [];
  for (const [a, b] of edges) {
    const ia = index.get(a);
    const ib = index.get(b);
    if (ia !== undefined && ib !== undefined && ia !== ib) adj.push([ia, ib]);
  }

  // Small force simulation; fixed nodes do not move.
  const ITER = 160;
  const REPULSE = 0.0035;
  const SPRING = 0.02;
  const REST = 0.16;
  for (let it = 0; it < ITER; it++) {
    const cool = 1 - it / ITER;
    const fx = new Array(nodes.length).fill(0);
    const fy = new Array(nodes.length).fill(0);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) {
          dx = (hash01(nodes[i].id + nodes[j].id, it) - 0.5) * 0.01;
          dy = (hash01(nodes[j].id + nodes[i].id, it) - 0.5) * 0.01;
          d2 = dx * dx + dy * dy + 1e-6;
        }
        const f = REPULSE / d2;
        const d = Math.sqrt(d2);
        fx[i] += (dx / d) * f;
        fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f;
        fy[j] -= (dy / d) * f;
      }
    }

    for (const [ia, ib] of adj) {
      const dx = nodes[ib].x - nodes[ia].x;
      const dy = nodes[ib].y - nodes[ia].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
      const f = SPRING * (d - REST);
      fx[ia] += (dx / d) * f;
      fy[ia] += (dy / d) * f;
      fx[ib] -= (dx / d) * f;
      fy[ib] -= (dy / d) * f;
    }

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].fixed) continue;
      // gentle pull to center to keep strays on the map
      fx[i] += (0.5 - nodes[i].x) * 0.004;
      fy[i] += (0.5 - nodes[i].y) * 0.004;
      nodes[i].x = clamp01(nodes[i].x + Math.max(-0.03, Math.min(0.03, fx[i])) * cool);
      nodes[i].y = clamp01(nodes[i].y + Math.max(-0.03, Math.min(0.03, fy[i])) * cool);
    }
  }

  return positionsOf(nodes);
}

function clamp01(v: number): number {
  return Math.max(0.03, Math.min(0.97, v));
}

function positionsOf(nodes: LayoutNode[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) out[n.id] = { x: n.x, y: n.y };
  return out;
}
