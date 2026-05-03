import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, handlePreflight } from "../lib/cors";
import { GameShiftError, getUserByReferenceId, registerUser } from "../lib/gameshift";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ["POST"]);
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  console.log(`[register-wallet] email=${email}`);

  try {
    const created = await registerUser(email);
    if (created) {
      if (!created.address) {
        return res.status(502).json({
          error: "Wallet provisioning failed",
          detail: "wallet address not found in GameShift response",
        });
      }
      return res.status(200).json({ wallet: created.address, isNewUser: true });
    }

    const existing = await getUserByReferenceId(email);
    if (!existing.address) {
      return res.status(502).json({
        error: "Wallet provisioning failed",
        detail: "wallet address not found in GameShift response",
      });
    }
    return res.status(200).json({ wallet: existing.address, isNewUser: false });
  } catch (err) {
    if (err instanceof GameShiftError) {
      console.error(`[register-wallet] gameshift ${err.status}: ${err.message}`);
      return res
        .status(502)
        .json({ error: "Wallet provisioning failed", detail: err.message });
    }
    const detail = err instanceof Error ? err.message : "unknown error";
    console.error(`[register-wallet] unexpected: ${detail}`);
    return res.status(500).json({ error: detail });
  }
}
