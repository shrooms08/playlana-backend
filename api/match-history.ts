import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getProgram } from "../lib/anchor-client";
import { applyCors, handlePreflight } from "../lib/cors";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseIntParam(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ["GET"]);
  if (handlePreflight(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const limit = Math.max(1, Math.min(MAX_LIMIT, parseIntParam(req.query.limit, DEFAULT_LIMIT)));
  const offset = Math.max(0, parseIntParam(req.query.offset, 0));

  try {
    const program = getProgram();
    const all = await program.account.matchResult.all();

    all.sort((a, b) => {
      const aId = BigInt(a.account.matchId.toString());
      const bId = BigInt(b.account.matchId.toString());
      if (aId === bId) return 0;
      return aId > bId ? -1 : 1;
    });

    const page = all.slice(offset, offset + limit).map((entry) => {
      const m = entry.account;
      const players = m.players.slice(0, m.playerCount).map((p) => ({
        wallet: p.wallet.toBase58(),
        characterIndex: p.characterIndex,
        crownWins: p.crownWins,
      }));
      return {
        account: entry.publicKey.toBase58(),
        matchId: m.matchId.toString(),
        winner: m.winner.toBase58(),
        timestamp: m.timestamp.toString(),
        submittedBy: m.submittedBy.toBase58(),
        playerCount: m.playerCount,
        players,
      };
    });

    return res.status(200).json({
      total: all.length,
      limit,
      offset,
      matches: page,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("match-history failed:", message);
    return res.status(500).json({ error: message });
  }
}
