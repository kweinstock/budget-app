import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/budget-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Budget System',
        short_name: 'Ledger',
        description: 'Personal budgeting app',
        theme_color: '#F5F3EE',
        background_color: '#F5F3EE',
        display: 'standalone',
        start_url: '/budget-app/',
        scope: '/budget-app/',
        icons: [
          {
            src: 'ledger-logo-dark-small.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'ledger-logo-dark-medium.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})