// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL and BASE_PATH are filled in by the GitHub Pages workflow.
const base = process.env.BASE_PATH || '/';

// Photos added through the editor are saved as /images/...
// This makes those links work even when the site lives in a sub-folder.
function prefixImages() {
  const prefix = base.replace(/\/$/, '');
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'img') {
      const src = node.properties?.src;
      if (typeof src === 'string' && src.startsWith('/images/')) node.properties.src = prefix + src;
      node.properties.loading = 'lazy';
    }
    (node.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://ibidun-aliyah.github.io',
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  markdown: { rehypePlugins: [prefixImages] },
});
