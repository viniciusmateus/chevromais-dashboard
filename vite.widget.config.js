import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig({
  // Subtitui 'process.env' pelo objeto window/env do navegador para evitar o crash no React/Firebase
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  plugins: [
    react(),
    tailwindcss(),
    cssInjectedByJsPlugin(),
  ],
  build: {
    // Salva diretamente dentro de dist/widget
    outDir: 'dist/widget',
    // IMPORTANTE: Impede que o Vite limpe a pasta 'dist' inteira ao gerar o widget
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/standalone/tire-search-widget.jsx'),
      name: 'TireSearchWidget',
      fileName: () => 'tire-search.js',
      formats: ['iife'],
    },
    rollupOptions: {
      external: [],
    },
  },
});