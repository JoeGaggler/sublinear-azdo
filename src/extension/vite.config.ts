import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  css: {
    // Enable LightningCSS errorRecovery to strip unsupported legacy codes
    // (see Vite docs: css.lightningcss.errorRecovery)
    lightningcss: {
      errorRecovery: true,
    },
  },
  build: {
    // Explicitly use LightningCSS for CSS minification so the above option applies
    cssMinify: 'lightningcss',
    rollupOptions: {
      input: {
        home: './web/home/index.html',
        teams: './web/teams/index.html'
      },
    }
  }
})
