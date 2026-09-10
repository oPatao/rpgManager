import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza automaticamente se você mexer no código no futuro
      manifest: {
        name: 'RPG Scene Manager',
        short_name: 'RPG Manager',
        description: 'Painel de Controle e Tela de Jogadores Offline para RPG',
        theme_color: '#0f172a', // Cor do painel de fundo (slate-900)
        background_color: '#000000',
        display: 'standalone', // É isto que remove a barra do navegador e a faz parecer nativa
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],

  server: {
    allowedHosts: ['dictate-ashamed-password.ngrok-free.dev']
  }
})
