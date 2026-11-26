// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL and BASE_PATH are filled in by the GitHub Pages workflow.
// Locally they fall back to the user-site address.
export default defineConfig({
  site: process.env.SITE_URL || 'https://ibidun-aliyah.github.io',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
