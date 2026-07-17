// Small fuzzy matcher for the command palette.
// Subsequence match with word-boundary and contiguity bonuses.

export interface FuzzyResult {
  score: number;
  /** matched character indices in the haystack */
  indices: number[];
}

export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return { score: 0, indices: [] };

  // Fast path: substring
  const sub = t.indexOf(q);
  if (sub !== -1) {
    const indices = Array.from({ length: q.length }, (_, i) => sub + i);
    let score = 100 - sub;
    if (sub === 0 || /[\s\-_/.]/.test(t[sub - 1])) score += 40;
    score -= Math.floor(t.length / 8);
    return { score, indices };
  }

  // Subsequence
  const indices: number[] = [];
  let ti = 0;
  let score = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti);
    if (found === -1) return null;
    if (found === ti && indices.length > 0) {
      streak += 1;
      score += 6 + streak;
    } else {
      streak = 0;
      score += 1;
      if (found === 0 || /[\s\-_/.]/.test(t[found - 1])) score += 10;
    }
    indices.push(found);
    ti = found + 1;
  }
  score -= Math.floor(t.length / 10);
  return { score, indices };
}

export function highlightSegments(
  text: string,
  indices: number[]
): { text: string; hit: boolean }[] {
  if (indices.length === 0) return [{ text, hit: false }];
  const set = new Set(indices);
  const out: { text: string; hit: boolean }[] = [];
  let buf = '';
  let cur = set.has(0);
  for (let i = 0; i < text.length; i++) {
    const hit = set.has(i);
    if (hit !== cur) {
      if (buf) out.push({ text: buf, hit: cur });
      buf = '';
      cur = hit;
    }
    buf += text[i];
  }
  if (buf) out.push({ text: buf, hit: cur });
  return out;
}
