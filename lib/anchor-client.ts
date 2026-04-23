import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl/playlana_core.json";
import type { PlaylanaCore } from "../types/playlana_core";
import { getConnection } from "./helius";
import { getAuthorityKeypair } from "./keypair";

let cached: Program<PlaylanaCore> | null = null;

export function getProgram(): Program<PlaylanaCore> {
  if (cached) return cached;

  const connection = getConnection();
  const authority = getAuthorityKeypair();
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  const envProgramId = process.env.PROGRAM_ID?.trim();
  const idlAddress = (idl as { address: string }).address;
  if (envProgramId && envProgramId !== idlAddress) {
    throw new Error(
      `PROGRAM_ID env (${envProgramId}) does not match IDL address (${idlAddress})`
    );
  }

  cached = new Program(idl as unknown as PlaylanaCore, provider);
  return cached;
}

export function getProgramId(): PublicKey {
  return new PublicKey((idl as { address: string }).address);
}
