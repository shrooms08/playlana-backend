import { Connection, clusterApiUrl } from "@solana/web3.js";

let cached: Connection | null = null;

export function getConnection(): Connection {
  if (cached) return cached;

  const url = process.env.HELIUS_RPC_URL?.trim() || clusterApiUrl("devnet");
  cached = new Connection(url, "confirmed");
  return cached;
}
