import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getProgram } from "../lib/anchor-client";
import { getAuthorityKeypair } from "../lib/keypair";
import { getConnection } from "../lib/helius";
import { configPda, matchPda, profilePda } from "../lib/pdas";

interface SubmitPlayer {
  wallet: string;
  characterIndex: number;
  crownWins: number;
}

interface SubmitMatchBody {
  players: SubmitPlayer[];
  winnerWallet: string;
}

const MAX_CHARACTERS = 20;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message });
}

function parsePubkey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body as Partial<SubmitMatchBody> | undefined;
  if (!body || !Array.isArray(body.players) || typeof body.winnerWallet !== "string") {
    return badRequest(res, "expected { players: [...], winnerWallet: string }");
  }

  if (body.players.length < MIN_PLAYERS || body.players.length > MAX_PLAYERS) {
    return badRequest(res, `players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`);
  }

  const winnerKey = parsePubkey(body.winnerWallet);
  if (!winnerKey) return badRequest(res, "invalid winnerWallet");

  const playersParsed: { wallet: PublicKey; characterIndex: number; crownWins: number }[] = [];
  for (const [i, p] of body.players.entries()) {
    if (!p || typeof p.wallet !== "string") {
      return badRequest(res, `players[${i}].wallet missing`);
    }
    const wallet = parsePubkey(p.wallet);
    if (!wallet) return badRequest(res, `players[${i}].wallet is not a valid pubkey`);

    if (
      typeof p.characterIndex !== "number" ||
      !Number.isInteger(p.characterIndex) ||
      p.characterIndex < 0 ||
      p.characterIndex >= MAX_CHARACTERS
    ) {
      return badRequest(res, `players[${i}].characterIndex must be 0..${MAX_CHARACTERS - 1}`);
    }

    if (
      typeof p.crownWins !== "number" ||
      !Number.isInteger(p.crownWins) ||
      p.crownWins < 0 ||
      p.crownWins > 255
    ) {
      return badRequest(res, `players[${i}].crownWins must be 0..255`);
    }

    playersParsed.push({
      wallet,
      characterIndex: p.characterIndex,
      crownWins: p.crownWins,
    });
  }

  const winnerInList = playersParsed.some((p) => p.wallet.equals(winnerKey));
  if (!winnerInList) {
    return badRequest(res, "winnerWallet must appear in players list");
  }

  try {
    const program = getProgram();
    const connection = getConnection();
    const authority = getAuthorityKeypair();
    const config = configPda();

    const profileSignatures: Record<string, string> = {};
    for (const p of playersParsed) {
      const profile = profilePda(p.wallet);
      const acct = await connection.getAccountInfo(profile);
      if (acct) continue;

      const sig = await program.methods
        .createPlayerProfile()
        .accounts({
          playerProfile: profile,
          config,
          player: p.wallet,
          payer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        } as never)
        .rpc({ commitment: "confirmed" });
      profileSignatures[p.wallet.toBase58()] = sig;
    }

    const cfgBefore = await program.account.config.fetch(config);
    const matchId = BigInt(cfgBefore.totalMatches.toString());
    const matchAccount = matchPda(matchId);

    const submitSig = await program.methods
      .submitMatchResult({
        winner: winnerKey,
        players: playersParsed.map((p) => ({
          wallet: p.wallet,
          characterIndex: p.characterIndex,
          crownWins: p.crownWins,
        })),
      })
      .accounts({
        matchResult: matchAccount,
        config,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc({ commitment: "confirmed" });

    const statsSignatures: Record<string, string> = {};
    for (const p of playersParsed) {
      const profile = profilePda(p.wallet);
      const won = p.wallet.equals(winnerKey);
      const sig = await program.methods
        .updatePlayerStats(p.crownWins, won)
        .accounts({
          playerProfile: profile,
          config,
          player: p.wallet,
          authority: authority.publicKey,
        } as never)
        .rpc({ commitment: "confirmed" });
      statsSignatures[p.wallet.toBase58()] = sig;
    }

    return res.status(200).json({
      matchId: matchId.toString(),
      matchAccount: matchAccount.toBase58(),
      signatures: {
        createProfile: profileSignatures,
        submitMatch: submitSig,
        updateStats: statsSignatures,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("submit-match failed:", message);
    return res.status(500).json({ error: message });
  }
}

