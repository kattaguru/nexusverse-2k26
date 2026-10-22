import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { apiRouter } from './server/apiRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function adminRoutePlugin() {
  return {
    name: 'nexusverse-admin-route-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (!req.url) return next();
        const pathname = req.url.split('?')[0].toLowerCase().replace(/\/+$/, '');
        if (pathname === '/admin' || pathname === '/admin.html') {
          res.writeHead(302, { Location: '/' });
          res.end();
          return;
        } else if (
          pathname === '/nexusadmin' || 
          pathname.startsWith('/nexusadmin/') || 
          pathname === '/nexusadmin.html' ||
          pathname === '/nexusscan' ||
          pathname === '/scan' ||
          pathname === '/nexusverify' ||
          pathname.startsWith('/nexusverify/') ||
          pathname === '/nexusverify.html'
        ) {
          const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
          req.url = '/register.html' + query;
        } else if (pathname.startsWith('/pass/') || pathname.startsWith('/verify/')) {
          const parts = pathname.split('/');
          const passId = parts[2];
          req.url = `/register.html?passId=${encodeURIComponent(passId)}`;
        }
        next();
      });
    },
  };
}

function backendDevPlugin() {
  return {
    name: 'nexusverse-backend-plugin',
    configureServer(server: any) {
      const app = express();
      app.use(express.json({ 
        limit: '50mb',
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        }
      }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));
      app.use('/api', apiRouter);

      // Gracefully handle malformed JSON / request body parsing errors without crashing into Vite overlay
      app.use((err: any, _req: any, res: any, next: any) => {
        if (err) {
          console.warn('API Request parsing notice:', err.message);
          return res.status(400).json({ success: false, error: err.message || 'Invalid JSON format' });
        }
        next();
      });

      server.middlewares.use(app);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [adminRoutePlugin(), react(), tailwindcss(), backendDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true' ? { overlay: false } : false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          register: path.resolve(__dirname, 'register.html'),
        },
      },
    },
  };
});
