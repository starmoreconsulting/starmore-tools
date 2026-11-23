// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://starmoretools.com',
  integrations: [react()],
  vite: {
    build: {
      rolldownOptions: {
        onwarn(warning, defaultHandler) {
          const isClawPdfNodeFallback =
            warning.message.includes('has been externalized for browser compatibility') &&
            warning.message.includes('node:') &&
            warning.message.includes('node_modules/clawpdf/');
          if (isClawPdfNodeFallback) return;
          defaultHandler(warning);
        }
      }
    }
  }
});