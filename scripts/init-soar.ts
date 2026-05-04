import "dotenv/config";
import { Keypair, PublicKey } from "@solana/web3.js";
import { GameType, Genre, SoarProgram } from "@magicblock-labs/soar-sdk";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getAuthorityKeypair } from "../lib/keypair";
import { getConnection } from "../lib/helius";
import { generateSoarPlayerSeedHex } from "../lib/soar-keys";

const GAME_TITLE = "PlayLana";
const GAME_DESCRIPTION =
  "Browser-based party gaming on Solana — phones as controllers, persistent on-chain stats";
const LEADERBOARD_DESCRIPTION = "Crown Royale — Total Crowns Earned";
const SCORES_TO_RETAIN = 100;
const SCORES_ASCENDING = false; // highest crowns rank first
const ALLOW_MULTIPLE_SCORES = false;

async function main() {
  const connection = getConnection();
  const authority = getAuthorityKeypair();
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  const soar = SoarProgram.get(provider);

  console.log("Authority:        ", authority.publicKey.toBase58());
  console.log("RPC:              ", connection.rpcEndpoint);
  console.log();

  // -- SOAR_PLAYER_SEED check
  if (!process.env.SOAR_PLAYER_SEED?.trim()) {
    const generated = generateSoarPlayerSeedHex();
    console.log("⚠ SOAR_PLAYER_SEED is not set. Generated a new value:");
    console.log(`  SOAR_PLAYER_SEED=${generated}`);
    console.log(
      "  Add this to your .env BEFORE running submit-match or leaderboard\n  endpoints, or all SOAR identities will not match.\n"
    );
  } else {
    console.log("SOAR_PLAYER_SEED is set ✓");
  }

  // -- Game account
  let gameAddress: PublicKey | null = process.env.SOAR_GAME_PUBKEY?.trim()
    ? new PublicKey(process.env.SOAR_GAME_PUBKEY.trim())
    : null;

  if (gameAddress) {
    try {
      await soar.fetchGameAccount(gameAddress);
      console.log(`✓ SOAR Game already exists: ${gameAddress.toBase58()}`);
    } catch {
      console.log(
        `⚠ SOAR_GAME_PUBKEY (${gameAddress.toBase58()}) is set but the account doesn't exist. Will create a new Game.`
      );
      gameAddress = null;
    }
  }

  if (!gameAddress) {
    const newGameKp = Keypair.generate();
    console.log(`Creating SOAR Game (new keypair: ${newGameKp.publicKey.toBase58()})...`);
    const { newGame, transaction } = await soar.initializeNewGame(
      newGameKp.publicKey,
      GAME_TITLE,
      GAME_DESCRIPTION,
      Genre.Casual,
      GameType.Web,
      authority.publicKey, // nftMeta placeholder
      [authority.publicKey]
    );
    const sig = await soar.sendAndConfirmTransaction(transaction, [newGameKp]);
    gameAddress = newGame;
    console.log(`✓ SOAR Game initialized: ${gameAddress.toBase58()}`);
    console.log(`  tx: ${sig}`);
  }

  // -- Leaderboard
  let leaderboardAddress: PublicKey | null = process.env.SOAR_LEADERBOARD_PUBKEY?.trim()
    ? new PublicKey(process.env.SOAR_LEADERBOARD_PUBKEY.trim())
    : null;

  if (leaderboardAddress) {
    try {
      await soar.fetchLeaderBoardAccount(leaderboardAddress);
      console.log(`✓ SOAR Leaderboard already exists: ${leaderboardAddress.toBase58()}`);
    } catch {
      console.log(
        `⚠ SOAR_LEADERBOARD_PUBKEY (${leaderboardAddress.toBase58()}) is set but the account doesn't exist. Will create a new Leaderboard.`
      );
      leaderboardAddress = null;
    }
  }

  if (!leaderboardAddress) {
    console.log("Creating SOAR Leaderboard...");
    const { newLeaderBoard, transaction } = await soar.addNewGameLeaderBoard(
      gameAddress,
      authority.publicKey,
      LEADERBOARD_DESCRIPTION,
      authority.publicKey, // nftMeta placeholder
      SCORES_TO_RETAIN,
      SCORES_ASCENDING,
      undefined,
      undefined,
      undefined,
      ALLOW_MULTIPLE_SCORES
    );
    const sig = await soar.sendAndConfirmTransaction(transaction);
    leaderboardAddress = newLeaderBoard;
    console.log(`✓ SOAR Leaderboard created: ${leaderboardAddress.toBase58()}`);
    console.log(`  tx: ${sig}`);
  }

  console.log("\nDone.\n");
  console.log("Add these to your .env (and the matching Vercel env vars):");
  console.log(`SOAR_GAME_PUBKEY=${gameAddress.toBase58()}`);
  console.log(`SOAR_LEADERBOARD_PUBKEY=${leaderboardAddress.toBase58()}`);
}

main().catch((err) => {
  console.error("init-soar failed:");
  console.error(err);
  process.exit(1);
});
