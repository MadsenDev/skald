import { motion } from 'framer-motion';
import { FiFolder } from 'react-icons/fi';

export function LoadingScreen() {
  return (
    <div
      className="flex items-center justify-center h-screen relative overflow-hidden"
      style={{
        background: `radial-gradient(circle at 0% 0%, rgba(255,255,255,0.04), transparent 55%),
                      radial-gradient(circle at 100% 100%, rgba(0,0,0,0.4), transparent 55%),
                      linear-gradient(135deg, var(--theme-bg-secondary) 0%, var(--theme-bg-tertiary) 100%)`,
      }}
    >
      {/* Animated background layers */}
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

      <motion.div
        className="absolute -top-40 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--theme-accent) 0%, transparent 60%)',
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
          background: 'radial-gradient(circle, var(--theme-accent) 0%, transparent 60%)',
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

      {/* Loading content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 210, damping: 18 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, var(--theme-bg-secondary), rgba(255,255,255,0.06))',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <FiFolder
              className="w-8 h-8"
              style={{ color: 'var(--theme-accent)' }}
            />
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          <motion.span
            className="text-sm font-medium"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Loading
          </motion.span>
          <motion.div
            className="flex gap-1"
            initial="hidden"
            animate="visible"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--theme-accent)' }}
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

