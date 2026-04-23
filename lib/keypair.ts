import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let cached: Keypair | null = null;

export function getAuthorityKeypair(): Keypair {
  if (cached) return cached;

  const raw = process.env.AUTHORITY_SECRET_KEY;
  if (!raw) {
    throw new Error("AUTHORITY_SECRET_KEY env var is required");
  }

  const trimmed = raw.trim();
  let secret: Uint8Array;

  if (trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("AUTHORITY_SECRET_KEY: invalid JSON array");
    }
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number")) {
      throw new Error("AUTHORITY_SECRET_KEY: JSON must be an array of numbers");
    }
    secret = Uint8Array.from(parsed as number[]);
  } else {
    try {
      secret = bs58.decode(trimmed);
    } catch {
      throw new Error("AUTHORITY_SECRET_KEY: invalid base58 string");
    }
  }

  if (secret.length !== 64) {
    throw new Error(
      `AUTHORITY_SECRET_KEY: expected 64 bytes, got ${secret.length}`
    );
  }

  cached = Keypair.fromSecretKey(secret);
  return cached;
}
