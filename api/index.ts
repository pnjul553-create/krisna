import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/app';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.url) {
    const parsed = new URL(req.url, 'http://localhost');
    const origPath = parsed.searchParams.get('__path');
    if (origPath) {
      parsed.searchParams.delete('__path');
      const qs = parsed.searchParams.toString();
      req.url = origPath + (qs ? `?${qs}` : '');
    }
  }
  return app(req as any, res as any);
}
