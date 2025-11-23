import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/google-api': {
            target: 'https://generativelanguage.googleapis.com',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/google-api/, '')
          },
          '/openai-api': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/openai-api/, '')
          },
          '/doubao-api': {
            target: 'https://ark.cn-beijing.volces.com',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/doubao-api/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
