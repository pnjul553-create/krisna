import 'dotenv/config';
import express from 'express';
import path from 'path';
import { app, USE_SUPABASE } from './server/app.ts';

const PORT = process.env.NGINX_PORT
  ? Number(process.env.DEFAULT_APP_PORT) || 3000
  : Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `SMK Prima Unggul server running on http://0.0.0.0:${PORT} (${USE_SUPABASE ? 'Supabase' : 'SQLite'} mode)`
    );
  });
}

startServer();
