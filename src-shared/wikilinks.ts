// [[Wikilink]] parsing helpers shared by indexer and renderer.

export interface WikilinkParts {
  target: string;
  heading: string | null;
  display: string;
}

export function parseWikilink(inner: string): WikilinkParts {
  const pipe = inner.indexOf('|');
  const targetPart = pipe === -1 ? inner : inner.slice(0, pipe);
  const display = pipe === -1 ? null : inner.slice(pipe + 1).trim();
  const hash = targetPart.indexOf('#');
  const target = (hash === -1 ? targetPart : targetPart.slice(0, hash)).trim();
  const heading = hash === -1 ? null : targetPart.slice(hash + 1).trim();
  return { target, heading, display: display || (heading ? `${target} › ${heading}` : target) };
}

/** All distinct link target names in a body, in order of first appearance. */
export function extractWikilinkTargets(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutCode)) !== null) {
    const { target } = parseWikilink(m[1]);
    const key = target.toLowerCase();
    if (target && !seen.has(key)) {
      seen.add(key);
      out.push(target);
    }
  }
  return out;
}

/** Count every wikilink occurrence (not deduplicated). */
export function countWikilinks(body: string): number {
  const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return (withoutCode.match(/\[\[[^\]]+\]\]/g) || []).length;
}

/**
 * Rewrite every wikilink pointing at `oldName` to `newName`,
 * preserving heading and display parts.
 */
export function renameWikilinks(body: string, oldName: string, newName: string): string {
  return body.replace(/\[\[([^\]]+)\]\]/g, (whole, inner: string) => {
    const { target } = parseWikilink(inner);
    if (target.toLowerCase() !== oldName.toLowerCase()) return whole;
    const rest = inner.slice(inner.toLowerCase().indexOf(target.toLowerCase()) + target.length);
    return `[[${newName}${rest}]]`;
  });
}

/** Extract a short snippet around the first mention of `name` in a body. */
export function snippetAround(body: string, name: string, radius = 90): string {
  const idx = body.toLowerCase().indexOf(`[[${name.toLowerCase()}`);
  if (idx === -1) return body.slice(0, radius * 2).replace(/\s+/g, ' ').trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(body.length, idx + name.length + radius);
  const core = body.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${core}${end < body.length ? '…' : ''}`;
}
