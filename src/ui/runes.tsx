import type { CSSProperties, ReactNode } from 'react';
import type { SchemaName } from '../../src-shared/types';

// Monoline geometric rune marks, keyed by schema. Drawn on a 24×24 grid,
// single consistent stroke; inherits currentColor so callers tint by tone.

const RUNE_PATHS: Record<string, ReactNode> = {
  // nauthiz — a stave crossed once
  Note: (
    <>
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="4.5" y1="15.5" x2="14.5" y2="8.5" />
    </>
  ),
  // wunjo-ish pennant — a thing in motion
  Project: (
    <>
      <line x1="8" y1="4" x2="8" y2="20" />
      <path d="M8 5 L16 9 L8 13" />
    </>
  ),
  // raidho — bowl + leg, a character on the road
  Person: (
    <>
      <line x1="8" y1="4" x2="8" y2="20" />
      <path d="M8 4 L15 7.5 L8 11.5" />
      <line x1="8" y1="11.5" x2="15.5" y2="20" />
    </>
  ),
  // tiwaz — an arrow pointing up at this day
  Daily: (
    <>
      <line x1="12" y1="5" x2="12" y2="20" />
      <line x1="6.5" y1="10.5" x2="12" y2="5" />
      <line x1="17.5" y1="10.5" x2="12" y2="5" />
    </>
  ),
  // mannaz — two staves bound by a V, a thinking self
  Idea: (
    <>
      <line x1="5" y1="4" x2="5" y2="20" />
      <line x1="19" y1="4" x2="19" y2="20" />
      <line x1="5" y1="5" x2="12" y2="12.5" />
      <line x1="19" y1="5" x2="12" y2="12.5" />
    </>
  ),
  // berkana — two bows, where things grow from
  Source: (
    <>
      <line x1="8" y1="4" x2="8" y2="20" />
      <path d="M8 4 L15 7.5 L8 11" />
      <path d="M8 11.5 L15 15.5 L8 19" />
    </>
  ),
  // thurisaz — a single hammer-stroke, a craft mark
  Code: (
    <>
      <line x1="8" y1="4" x2="8" y2="20" />
      <path d="M8 8 L15.5 12 L8 16" />
    </>
  ),
  // othala — a hearth / place
  Place: (
    <>
      <path d="M12 4 L17 9 L12 14 L7 9 Z" />
      <line x1="9.5" y1="12" x2="6.5" y2="20" />
      <line x1="14.5" y1="12" x2="17.5" y2="20" />
    </>
  ),
};

export function Rune({
  schema = 'Note',
  size = 16,
  className = '',
  style,
  strokeWidth,
}: {
  schema?: SchemaName | string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  const children = RUNE_PATHS[schema] ?? RUNE_PATHS.Note;
  const sw = strokeWidth || (size <= 14 ? 1.9 : size <= 20 ? 1.7 : 1.5);
  return (
    <svg
      className={'rune ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** CSS var for a schema's tone, e.g. schemaTone("Project") → "var(--schema-project)" */
export function schemaTone(schema: string | undefined): string {
  const key = (schema || 'Note').toLowerCase();
  const known = ['note', 'project', 'person', 'daily', 'idea', 'source', 'code', 'place'];
  return known.includes(key) ? `var(--schema-${key})` : 'var(--tx-2)';
}
