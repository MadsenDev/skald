import { defineConfig } from 'vite';

// Builds the Electron main process and preload script.
// Invoked twice: `--mode main` and `--mode preload`.
export default defineConfig(({ mode }) => {
  if (mode === 'preload') {
    return {
      build: {
        outDir: 'dist-electron',
        emptyOutDir: false,
        lib: {
          entry: 'src-main/preload.ts',
          formats: ['cjs'],
          fileName: () => 'preload.cjs',
        },
        rollupOptions: {
          external: ['electron'],
        },
      },
    };
  }
  return {
    build: {
      outDir: 'dist-electron',
      emptyOutDir: false,
      lib: {
        entry: 'src-main/main.ts',
        formats: ['es'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: ['electron', 'chokidar', /^node:/],
      },
    },
  };
});
