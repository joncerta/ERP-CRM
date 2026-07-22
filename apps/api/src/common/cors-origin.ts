/**
 * Shared by the HTTP CORS setup (main.ts) and the WebSocket gateway so both
 * transports agree on which origins are allowed — configured via WEB_ORIGIN
 * in production, plus any localhost port in dev (Vite falls back to a
 * different port if 5173 is taken).
 */
export function corsOriginCheck(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  const configuredOrigins = process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? ['http://localhost:5173'];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!origin) return callback(null, true);
  const isLocalDev = !isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  const isAllowed = configuredOrigins.includes(origin) || isLocalDev;
  callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
}
