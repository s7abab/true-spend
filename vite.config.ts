import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function seoPlugin(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/$/, '');
  const hasBase = Boolean(base);
  let outDir = 'dist';

  return {
    name: 'truspend-seo',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      const ld = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Truspend',
        description: 'Track income and expenses with clarity.',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        ...(hasBase ? { url: `${base}/` } : {}),
      });
      let out = html.replace(
        '<!--SEO_LD_JSON-->',
        `<script type="application/ld+json">${ld}</script>`,
      );
      if (hasBase) {
        const imageUrl = `${base}/og-image.png`;
        const chunk = `    <link rel="canonical" href="${base}/" />
    <meta property="og:url" content="${base}/" />
    <meta property="og:image" content="${imageUrl}" />
    <meta name="twitter:image" content="${imageUrl}" />
`;
        out = out.replace('</head>', `${chunk}  </head>`);
      }
      return out;
    },
    closeBundle() {
      if (!hasBase) return;
      const abs = path.resolve(outDir);
      const robots = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
      fs.mkdirSync(abs, { recursive: true });
      fs.writeFileSync(path.join(abs, 'robots.txt'), robots, 'utf8');
      fs.writeFileSync(path.join(abs, 'sitemap.xml'), sitemap, 'utf8');
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_PUBLIC_SITE_URL ?? '').trim();

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'manifest.webmanifest', 'og-image.png'],
        manifest: {
          name: 'Truspend',
          short_name: 'Truspend',
          description: 'Track income and expenses with clarity.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#F2F2F7',
          theme_color: '#F2F2F7',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
      seoPlugin(siteUrl),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-motion': ['framer-motion'],
            'vendor-router': ['react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
