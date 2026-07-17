import { useState, useEffect } from 'react';
import { useVaultStore } from '../store/vaultStore';

interface BlockRefProps {
  blockId: string;
}

export function BlockRef({ blockId }: BlockRefProps) {
  const { notes } = useVaultStore();
  const [blockContent, setBlockContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // TODO: Implement block lookup from DB
    // For now, just show the block ID
    // In the future, this will query the block index to find the referenced block
    setLoading(false);
  }, [blockId]);
  
  if (loading) {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded text-sm border border-dashed"
        style={{
          borderColor: 'var(--theme-border-secondary)',
          color: 'var(--theme-text-secondary)',
        }}
      >
        (({blockId}))
      </span>
    );
  }
  
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-sm cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--theme-accent) 15%, transparent)',
        color: 'var(--theme-accent)',
        border: '1px solid',
        borderColor: 'color-mix(in srgb, var(--theme-accent) 30%, transparent)',
      }}
      title={`Block reference: ${blockId}`}
    >
      (({blockId}))
    </span>
  );
}

