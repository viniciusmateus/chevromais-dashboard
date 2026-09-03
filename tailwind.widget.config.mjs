/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  // Garante que no widget o Tailwind SÓ afete o container #tire-search-widget
  important: '#tire-search-widget',
  corePlugins: {
    // Desativa o Preflight (reset global) APENAS no widget para não quebrar o CSS do e-commerce
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};