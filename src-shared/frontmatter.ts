// Minimal YAML-ish frontmatter parsing/serialization.
// Handles the subset Skald writes: scalars, quoted strings, inline arrays,
// and block lists. Unknown structures survive as strings.

export interface ParsedNote {
  frontmatter: Record<string, unknown>;
  body: string;
  /** 0-based line index where the body starts in the raw content */
  bodyStartLine: number;
  hasFrontmatter: boolean;
}

export function parseFrontmatter(raw: string): ParsedNote {
  const match = raw.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: raw, bodyStartLine: 0, hasFrontmatter: false };
  }
  const fmText = match[1];
  const body = raw.slice(match[0].length);
  const bodyStartLine = match[0].split('\n').length - (match[0].endsWith('\n') ? 1 : 0);

  const frontmatter: Record<string, unknown> = {};
  const lines = fmText.split(/\r?\n/);
  let currentListKey: string | null = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      const arr = (frontmatter[currentListKey] as unknown[]) ?? [];
      arr.push(coerceScalar(listItem[1].trim()));
      frontmatter[currentListKey] = arr;
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawVal = kv[2].trim();

    if (rawVal === '') {
      // could be a block list header
      currentListKey = key;
      frontmatter[key] = [];
      continue;
    }
    currentListKey = null;

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const inner = rawVal.slice(1, -1).trim();
      frontmatter[key] = inner
        ? inner.split(',').map((v) => coerceScalar(v.trim()))
        : [];
    } else {
      frontmatter[key] = coerceScalar(rawVal);
    }
  }

  // Drop empty block-list placeholders that never got items and weren't lists
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v) && v.length === 0 && !fmText.match(new RegExp(`^${k}:\\s*\\[`, 'm'))) {
      const followedByList = fmText.match(new RegExp(`^${k}:\\s*$`, 'm'));
      if (!followedByList) delete frontmatter[k];
    }
  }

  return { frontmatter, body, bodyStartLine, hasFrontmatter: true };
}

function coerceScalar(v: string): unknown {
  const unquoted = v.replace(/^["'](.*)["']$/, '$1');
  if (unquoted !== v) return unquoted;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v) && !/^\d{4}-\d{2}/.test(v)) return Number(v);
  return v;
}

export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) return body;
  const lines: string[] = [];
  for (const key of keys) {
    const value = frontmatter[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(serializeScalar).join(', ')}]`);
    } else {
      lines.push(`${key}: ${serializeScalar(value)}`);
    }
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

function serializeScalar(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (/[:#\[\]{}"'\n]/.test(s) || s !== s.trim()) return JSON.stringify(s);
  return s;
}
