import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import { Logo } from './Logo';

interface VaultSelectorProps {
  onSelect: (path: string) => Promise<void>;
}

export function VaultSelector({ onSelect }: VaultSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await window.api.vault.getLastPath();
        setLastPath(p);
      } catch {
        setLastPath(null);
      }
    })();
  }, []);

  const handleSelect = async () => {
    setLoading(true);
    try {
      const path = await window.api.vault.select();
      if (path) {
        await onSelect(path);
      }
    } catch (error) {
      console.error('Failed to select vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLast = async () => {
    if (!lastPath) return;
    setLoading(true);
    try {
      const path = await window.api.vault.openPath(lastPath);
      if (path) {
        await onSelect(path);
      }
    } catch (error) {
      console.error('Failed to open last vault:', error);
      alert('Failed to open last vault. It may have been moved or deleted.');
      setLastPath(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center h-screen relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 0% 0%, rgba(255,255,255,0.04), transparent 55%),
                     radial-gradient(circle at 100% 100%, rgba(0,0,0,0.4), transparent 55%),
                     linear-gradient(135deg, var(--theme-bg-secondary) 0%, var(--theme-bg-tertiary) 100%)`,
      }}
    >
      {/* --- Layer 1: slow moving gradient wash --- */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(120deg,
              rgba(255,255,255,0.12),
              transparent 40%,
              rgba(255,255,255,0.06),
              transparent 80%)`,
          backgroundSize: '200% 200%',
          mixBlendMode: 'soft-light',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 50%', '0% 100%', '0% 0%'],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* --- Layer 2: subtle glassy grid --- */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.6,
          mixBlendMode: 'soft-light',
        }}
      />

      {/* --- Layer 3: accent orbs with gentle parallax --- */}
      <motion.div
        className="absolute -top-40 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, var(--theme-accent) 0%, transparent 60%)',
          opacity: 0.18,
        }}
        animate={{
          y: [0, 40, 0],
          x: [0, 20, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, var(--theme-accent) 0%, transparent 60%)',
          opacity: 0.16,
        }}
        animate={{
          y: [0, -30, 0],
          x: [0, -20, 0],
          scale: [1.02, 0.96, 1.02],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* --- Layer 4: subtle spotlight behind card --- */}
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        animate={{
          scale: [1, 1.03, 1],
          opacity: [0.18, 0.24, 0.18],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-[30rem] h-[30rem] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 60%)',
          }}
        />
      </motion.div>

      {/* Main content card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-bg-primary) 82%, transparent)',
          borderColor: 'color-mix(in srgb, var(--theme-border-primary) 65%, transparent)',
          boxShadow:
            '0 24px 60px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 210, damping: 18 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background:
                'linear-gradient(135deg, var(--theme-bg-secondary), rgba(255,255,255,0.06))',
              boxShadow:
                '0 18px 40px rgba(0, 0, 0, 0.4)',
            }}
          >
            <Logo
              size={32}
              style={{ color: 'var(--theme-accent)' }}
            />
          </motion.div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Welcome to Skald
          </h1>
          <p
            className="mb-6 text-sm"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Select a folder to use as your vault, or create a new one.
          </p>

          {lastPath && (
            <motion.button
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              onClick={handleOpenLast}
              disabled={loading}
              className="w-full mb-3 border py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--theme-bg-primary)',
                color: 'var(--theme-accent)',
                borderColor: 'var(--theme-border-primary)',
              }}
              whileHover={{
                scale: 1.01,
                transition: { duration: 0.12 },
              }}
              whileTap={{ scale: 0.98 }}
              title={lastPath}
            >
              <FiClock />
              Open Last Vault
            </motion.button>
          )}

          <motion.button
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: lastPath ? 0.35 : 0.25 }}
            onClick={handleSelect}
            disabled={loading}
            className="vault-select-button w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--theme-accent)',
            }}
            whileHover={{
              scale: 1.01,
              boxShadow: '0 0 22px rgba(0,0,0,0.35)',
              transition: { duration: 0.12 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Loading...' : 'Select Vault Folder'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}