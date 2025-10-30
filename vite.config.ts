import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 🚨 AGGIUNTO: Percorso base richiesto per il deployment su GitHub Pages
      base: '/projectzipperai/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
            // Ho ripristinato l'alias più comune se la sorgente è in ./src
            '~': path.resolve(__dirname, './src'), 
        }
      }
    };
});
