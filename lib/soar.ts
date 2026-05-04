import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SoarProgram } from "@magicblock-labs/soar-sdk";
import { getAuthorityKeypair } from "./keypair";
import { getConnection } from "./helius";
import { derivePlayerSoarKeypair } from "./soar-keys";

let cached: SoarProgram | null = null;

export function getSoarClient(): SoarProgram {
  if (cached) return cached;
  const connection = getConnection();
  const authority = getAuthorityKeypair();
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  cached = SoarProgram.get(provider);
  return cached;
}

export function getGamePubkey(): PublicKey {
  const v = process.env.SOAR_GAME_PUBKEY?.trim();
  if (!v) throw new Error("SOAR_GAME_PUBKEY env var is required");
  return new PublicKey(v);
}

export function getLeaderboardPubkey(): PublicKey {
  const v = process.env.SOAR_LEADERBOARD_PUBKEY?.trim();
  if (!v) throw new Error("SOAR_LEADERBOARD_PUBKEY env var is required");
  return new PublicKey(v);
}

/** Returns the SOAR Player account PDA for the deterministic per-player keypair. */
export function derivePlayerPda(playerWallet: PublicKey): PublicKey {
  const soarKp = derivePlayerSoarKeypair(playerWallet);
  return getSoarClient().utils.derivePlayerAddress(soarKp.publicKey)[0];
}

export function derivePlayerScoresPda(
  playerWallet: PublicKey,
  leaderboard: PublicKey = getLeaderboardPubkey()
): PublicKey {
  const soarKp = derivePlayerSoarKeypair(playerWallet);
  return getSoarClient().utils.derivePlayerScoresListAddress(
    soarKp.publicKey,
    leaderboard
  )[0];
}

/**
 * Idempotent: ensures the SOAR Player + PlayerScores PDAs exist for the
 * given player wallet, then submits the score to the leaderboard. Returns
 * the submit-score tx signature.
 */
export async function submitPlayerScore(
  playerWallet: PublicKey,
  score: bigint | number
): Promise<string> {
  const soar = getSoarClient();
  const connection = getConnection();
  const authority = getAuthorityKeypair();
  const leaderboard = getLeaderboardPubkey();

  const soarKp = derivePlayerSoarKeypair(playerWallet);
  const playerPda = soar.utils.derivePlayerAddress(soarKp.publicKey)[0];
  const scoresPda = soar.utils.derivePlayerScoresListAddress(
    soarKp.publicKey,
    leaderboard
  )[0];

  const playerAcct = await connection.getAccountInfo(playerPda);
  if (!playerAcct) {
    const username = `pl-${playerWallet.toBase58().slice(0, 12)}`;
    const { transaction } = await soar.initializePlayerAccount(
      soarKp.publicKey,
      username,
      authority.publicKey
    );
    await soar.sendAndConfirmTransaction(transaction, [soarKp]);
  }

  const scoresAcct = await connection.getAccountInfo(scoresPda);
  if (!scoresAcct) {
    const { transaction } = await soar.registerPlayerEntryForLeaderBoard(
      soarKp.publicKey,
      leaderboard
    );
    await soar.sendAndConfirmTransaction(transaction, [soarKp]);
  }

  const { transaction } = await soar.submitScoreToLeaderBoard(
    soarKp.publicKey,
    authority.publicKey,
    leaderboard,
    new BN(score.toString())
  );
  return await soar.sendAndConfirmTransaction(transaction);
}
