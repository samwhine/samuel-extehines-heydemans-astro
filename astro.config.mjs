import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import caseImageDimensions from './src/lib/case-image-dimensions.mjs';

export default defineConfig({
  // Replace this with the Vercel domain for the new Samuel Astro repository before publishing.
  site: 'https://samuel-extehines-heydemans-astro.vercel.app',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  markdown: { processor: satteri({ mdastPlugins: [caseImageDimensions()] }) },
  vite: {
    // Pre-bundle Mermaid's lazy diagram modules before the first dev-page request.
    optimizeDeps: { include: ['mermaid'] },
  },
});
