import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_ORIGINS = new Set([
  "https://play-lana.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

export function applyCors(req: VercelRequest, res: VercelResponse, methods: string[]): void {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", [...methods, "OPTIONS"].join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Returns true if the request was a preflight and has been fully responded to.
 * Caller should early-return when this returns true.
 */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
