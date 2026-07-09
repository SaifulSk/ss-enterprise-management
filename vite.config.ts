import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.png', 'logo.png'],
      manifest: {
        name: 'SS Enterprise Management',
        short_name: 'SS Enterprise',
        description: 'Civil & Interior Work Management System',
        theme_color: '#1E3A8A',
        background_color: '#F0F4F8',
        display: 'standalone',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192 512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
