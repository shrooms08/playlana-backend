import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PublicKey } from "@solana/web3.js";
import { applyCors, handlePreflight } from "../lib/cors";
import { getProgram } from "../lib/anchor-client";
import {
  getGamePubkey,
  getLeaderboardPubkey,
  getSoarClient,
} from "../lib/soar";
import { derivePlayerSoarKeypair } from "../lib/soar-keys";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, ["GET"]);
  if (handlePreflight(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const soar = getSoarClient();
    const leaderboard = getLeaderboardPubkey();
    // Acknowledge env presence; surface a clearer error if Game is misconfigured.
    void getGamePubkey();

    const topEntriesAddress = soar.utils.deriveLeaderTopEntriesAddress(leaderboard)[0];
    const top = await soar.fetchLeaderBoardTopEntriesAccount(topEntriesAddress);

    // Build a soarPubkey -> playerWallet map by recomputing each known
    // PlayerProfile wallet's derived SOAR pubkey.
    const program = getProgram();
    const profiles = await program.account.playerProfile.all();
    const reverseMap = new Map<string, PublicKey>();
    for (const entry of profiles) {
      const playerWallet = entry.account.wallet as PublicKey;
      const derived = derivePlayerSoarKeypair(playerWallet).publicKey;
      reverseMap.set(derived.toBase58(), playerWallet);
    }

    const sorted = [...top.topScores].sort((a, b) => {
      const av = BigInt(a.entry.score.toString());
      const bv = BigInt(b.entry.score.toString());
      if (av === bv) return 0;
      return top.isAscending
        ? av < bv
          ? -1
          : 1
        : av > bv
          ? -1
          : 1;
    });

    const entries = sorted.map((s, i) => {
      const soarPubkey = s.player.toBase58();
      const wallet = reverseMap.get(soarPubkey);
      return {
        rank: i + 1,
        soarPlayer: soarPubkey,
        wallet: wallet ? wallet.toBase58() : null,
        score: s.entry.score.toString(),
        timestamp: s.entry.timestamp.toString(),
      };
    });

    return res.status(200).json({
      leaderboard: leaderboard.toBase58(),
      isAscending: top.isAscending,
      entries,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("leaderboard failed:", message);
    return res.status(500).json({ error: message });
  }
}
