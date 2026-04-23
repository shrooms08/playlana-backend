import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../lib/anchor-client";
import { getConnection } from "../lib/helius";
import { profilePda } from "../lib/pdas";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  const walletParam = req.query.wallet;
  if (typeof walletParam !== "string" || !walletParam) {
    return res.status(400).json({ error: "missing ?wallet=..." });
  }

  let wallet: PublicKey;
  try {
    wallet = new PublicKey(walletParam);
  } catch {
    return res.status(400).json({ error: "invalid wallet pubkey" });
  }

  try {
    const program = getProgram();
    const connection = getConnection();
    const profile = profilePda(wallet);

    const acct = await connection.getAccountInfo(profile);
    if (!acct) {
      return res.status(404).json({ error: "profile not found", wallet: wallet.toBase58() });
    }

    const data = await program.account.playerProfile.fetch(profile);
    return res.status(200).json({
      profileAccount: profile.toBase58(),
      wallet: data.wallet.toBase58(),
      totalCrownsEarned: data.totalCrownsEarned.toString(),
      totalMatchesPlayed: data.totalMatchesPlayed.toString(),
      totalMatchesWon: data.totalMatchesWon.toString(),
      preferredCharacter: data.preferredCharacter,
      createdAt: data.createdAt.toString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("player-profile failed:", message);
    return res.status(500).json({ error: message });
  }
}
