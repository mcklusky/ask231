import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Country and brand for index.html and the app manifest. Same defaults as src/config/site.ts
 * (that file can't be imported here because it reads import.meta.env at runtime).
 */
function siteSettings(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const countryCode = env.VITE_COUNTRY_CODE || '231'
  const countryName = env.VITE_COUNTRY_NAME || 'Liberia'
  const siteName = `${env.VITE_BRAND_WORD || 'Ask'}${countryCode}`
  return { siteName, countryName, tagline: `Buy, sell and ask for anything in ${countryName}: phones, cars, homes, jobs and services.` }
}

/** Fills %SITE_NAME%, %COUNTRY_NAME% and %SITE_TAGLINE% in index.html and builds manifest.webmanifest from them. */
function siteBranding(mode: string): Plugin {
  const site = siteSettings(mode)
  const fill = (text: string) => text.replaceAll('%SITE_NAME%', site.siteName).replaceAll('%COUNTRY_NAME%', site.countryName).replaceAll('%SITE_TAGLINE%', site.tagline)
  const manifest = () => fill(readFileSync('manifest.template.json', 'utf8'))
  return {
    name: 'site-branding',
    transformIndexHtml: fill,
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => { res.setHeader('Content-Type', 'application/manifest+json'); res.end(manifest()) })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() })
    },
  }
}

export default defineConfig(({ mode }) => ({ plugins: [react(), siteBranding(mode)], resolve: { alias: { '@': '/src' } }, server: { port: 5173 } }))
