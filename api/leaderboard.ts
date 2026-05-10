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
      const soarPubkey = derivePlayerSoarKeypair(playerWallet).publicKey;
      const playerPda = soar.utils.derivePlayerAddress(soarPubkey)[0];
      reverseMap.set(playerPda.toBase58(), playerWallet);
    }

    const PLACEHOLDER_PUBKEY = "11111111111111111111111111111111";
    const MAX_ENTRIES = 50;

    const live = top.topScores.filter((s) => {
      if (s.player.toBase58() === PLACEHOLDER_PUBKEY) return false;
      const score = s.entry.score.toString();
      const timestamp = s.entry.timestamp.toString();
      if (score === "0" && timestamp === "0") return false;
      return true;
    });

    const sorted = live.sort((a, b) => {
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

    const entries = sorted.slice(0, MAX_ENTRIES).map((s, i) => {
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
