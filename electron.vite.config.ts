import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

export default defineConfig(({ mode }) => {
  const isPreload = mode === 'preload';

  return {
    build: {
      outDir: 'dist-electron',
      emptyOutDir: false, // Don't clear the directory between builds
      rollupOptions: {
        input: isPreload
          ? resolve(__dirname, 'src-main/preload.ts')
          : resolve(__dirname, 'src-main/main.ts'),
        external: ['electron', ...builtinModules],
        output: {
          entryFileNames: isPreload ? '[name].cjs' : '[name].js',
          format: isPreload ? 'cjs' : 'es',
        },
      },
      target: 'node18',
      minify: false,
    },
  };
});
