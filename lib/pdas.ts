import { PublicKey } from "@solana/web3.js";
import { getProgramId } from "./anchor-client";

const CONFIG_SEED = Buffer.from("config");
const REGISTRY_SEED = Buffer.from("characters");
const PROFILE_SEED = Buffer.from("profile");
const MATCH_SEED = Buffer.from("match");

export function configPda(programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
}

export function registryPda(programId: PublicKey = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([REGISTRY_SEED], programId)[0];
}

export function profilePda(
  wallet: PublicKey,
  programId: PublicKey = getProgramId()
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [PROFILE_SEED, wallet.toBuffer()],
    programId
  )[0];
}

export function matchPda(
  matchId: bigint | number,
  programId: PublicKey = getProgramId()
): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(matchId), 0);
  return PublicKey.findProgramAddressSync([MATCH_SEED, buf], programId)[0];
}
