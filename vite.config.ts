import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/** Serves /api/* in development with the same handler as the Vercel function (server-only env from .env.local). */
const api = (): Plugin => ({
  name: 'salacope-api',
  configureServer(server) {
    const env = loadEnv(server.config.mode, process.cwd(), '');
    Object.entries(env).forEach(([k, v]) => {
      if (!k.startsWith('VITE_') && process.env[k] === undefined) process.env[k] = v;
    });
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !/^\/api(\/|\?|$)/.test(req.url)) return next();
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url}`, {
          method: req.method,
          headers: Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)] as [string, string]])),
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });
        const { handle } = await server.ssrLoadModule('/server/app.ts');
        const response: Response = await handle(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        next(err);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), api()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    watch: {
      ignored: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/screenshot*.*', '**/dist/**'],
    },
  },
});
