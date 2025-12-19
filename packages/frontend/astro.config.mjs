// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), svelte()],
  vite: {
    plugins: [
      tailwindcss({
        // Tailwind v4 automatically scans for classes in these file types
      })
    ],
    server: {
      allowedHosts: ['haveibeendrained.org', 'www.haveibeendrained.org']
    }
  }
});