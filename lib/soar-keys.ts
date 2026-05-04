import { createHash } from "node:crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

let cachedSeed: Buffer | null = null;

function loadSeed(): Buffer {
  if (cachedSeed) return cachedSeed;
  const raw = process.env.SOAR_PLAYER_SEED?.trim();
  if (!raw) {
    throw new Error(
      "SOAR_PLAYER_SEED env var is required (32-byte secret, base58 or 64 hex chars). Run scripts/init-soar.ts to generate one."
    );
  }

  let bytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    bytes = Buffer.from(raw, "hex");
  } else {
    try {
      bytes = bs58.decode(raw);
    } catch {
      throw new Error("SOAR_PLAYER_SEED: invalid base58/hex");
    }
  }

  if (bytes.length !== 32) {
    throw new Error(`SOAR_PLAYER_SEED: expected 32 bytes, got ${bytes.length}`);
  }
  cachedSeed = Buffer.from(bytes);
  return cachedSeed;
}

/**
 * Deterministic per-player SOAR keypair. Same player wallet always maps to
 * the same SOAR keypair as long as SOAR_PLAYER_SEED is unchanged.
 */
export function derivePlayerSoarKeypair(playerWallet: PublicKey): Keypair {
  const seed = loadSeed();
  const hash = createHash("sha256")
    .update(seed)
    .update(playerWallet.toBuffer())
    .digest();
  return Keypair.fromSeed(hash);
}

export function generateSoarPlayerSeedHex(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
}
