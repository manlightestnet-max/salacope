/**
 * Salacope API on Vercel: every /api/* request is rewritten here (vercel.json) with the
 * original path in `__path`. Locally, the Vite dev server calls the same handler.
 */
import { handle } from '../server/app.js';

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
