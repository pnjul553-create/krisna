import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/app.ts';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
