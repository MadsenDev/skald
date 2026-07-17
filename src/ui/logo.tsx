// Wordmark + sigil. Primary mark: a right-angle "S" traced through six
// nodes — reads as the letter S and as a small graph.

export type LogoVariant = 'sigil' | 'monogram' | 'bracket';

function SigilLogo({ size = 22, withText = false }: { size?: number; withText?: boolean }) {
  const pts: [number, number][] = [
    [17, 5],
    [7, 5],
    [7, 11.5],
    [17, 11.5],
    [17, 19],
    [7, 19],
  ];
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Skald">
        <path d={d} stroke="var(--tx-1)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => {
          const accent = i === 3;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={accent ? 2.1 : 1.5}
              fill={accent ? 'var(--ac)' : 'var(--bg-1)'}
              stroke={accent ? 'var(--ac)' : 'var(--tx-1)'}
              strokeWidth="1.3"
            />
          );
        })}
      </svg>
      {withText && <span className="logo__word">SKALD</span>}
    </span>
  );
}

function MonogramLogo({ size = 22, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Skald">
        <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" stroke="var(--line-3)" strokeWidth="1.3" fill="var(--bg-3)" />
        <text x="12" y="16.5" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize="13" fill="var(--ac)">
          S
        </text>
      </svg>
      {withText && <span className="logo__word">SKALD</span>}
    </span>
  );
}

function BracketLogo({ size = 22, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <span className="logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Skald"
        stroke="var(--tx-1)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4 C6 4 6.5 11 4 12 C6.5 13 6 20 9 20" />
        <path d="M15 4 C18 4 17.5 11 20 12 C17.5 13 18 20 15 20" />
        <circle cx="12" cy="12" r="2" fill="var(--ac)" stroke="none" />
      </svg>
      {withText && <span className="logo__word">SKALD</span>}
    </span>
  );
}

export function Logo({
  variant = 'sigil',
  size = 22,
  withText = false,
}: {
  variant?: LogoVariant;
  size?: number;
  withText?: boolean;
}) {
  if (variant === 'monogram') return <MonogramLogo size={size} withText={withText} />;
  if (variant === 'bracket') return <BracketLogo size={size} withText={withText} />;
  return <SigilLogo size={size} withText={withText} />;
}
