import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uniwind } from 'uniwind/vite';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const sourceRoot = path.resolve(rootDir, 'src');
const assetsRoot = path.resolve(rootDir, 'assets');
const backgroundRoot = path.resolve(sourceRoot, 'background');
const desktopRoot = path.resolve(rootDir, 'src/desktop');

export default defineConfig(({ mode }) => ({
  root: sourceRoot,
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    uniwind({
      cssEntryFile: path.resolve(desktopRoot, 'styles.css'),
      dtsFile: path.resolve(rootDir, 'src/desktop/uniwind-types.d.ts')
    })
  ],
  css: {
    transformer: 'postcss'
  },
  define: {
    __DEV__: JSON.stringify(mode !== 'production')
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${sourceRoot}/` },
      { find: /^@assets\//, replacement: `${assetsRoot}/` },
      { find: 'react-native', replacement: 'react-native-web' }
    ],
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json'
    ]
  },
  optimizeDeps: {
    include: ['@rn-primitives/progress', '@rn-primitives/slot'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.mjs': 'jsx'
      }
    }
  },
  build: {
    outDir: path.resolve(rootDir, 'dist/windows'),
    emptyOutDir: true,
    rollupOptions: {
      input: [
        path.resolve(backgroundRoot, 'background.html'),
        path.resolve(desktopRoot, 'desktop.html')
      ]
    }
  }
}));
