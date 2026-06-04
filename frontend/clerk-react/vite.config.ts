// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-service-worker',
      configureServer(server) {
        server.middlewares.use('/sw.js', (_req, res) => {
          const swPath = path.resolve(__dirname, 'public/sw.js');
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Service-Worker-Allowed', '/');
          fs.createReadStream(swPath).pipe(res);
        });
      },
    },
  ],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    },
    dedupe: ['react', 'react-dom', '@clerk/clerk-react'],
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', '@clerk/clerk-react', 'react/jsx-runtime'],
  },
});
