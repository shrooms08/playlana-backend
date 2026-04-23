import "dotenv/config";
import { SystemProgram } from "@solana/web3.js";
import { getAuthorityKeypair } from "../lib/keypair";
import { getConnection } from "../lib/helius";
import { getProgram } from "../lib/anchor-client";
import { configPda, registryPda } from "../lib/pdas";

const CHARACTER_NAMES = [
  "batman",
  "bella",
  "chuky",
  "deadpool",
  "doc",
  "greenLatern",
  "miner",
  "naruto",
  "pablo",
  "pedro",
  "reina",
  "rey",
  "sherlock",
  "skeleton",
  "slenderman",
  "soldier",
  "steve",
  "superman",
  "wizard",
  "zorro",
];

async function main() {
  const connection = getConnection();
  const authority = getAuthorityKeypair();
  const program = getProgram();

  const config = configPda();
  const registry = registryPda();

  console.log("Authority:        ", authority.publicKey.toBase58());
  console.log("Program ID:       ", program.programId.toBase58());
  console.log("Config PDA:       ", config.toBase58());
  console.log("CharacterReg PDA: ", registry.toBase58());
  console.log("RPC:              ", connection.rpcEndpoint);
  console.log();

  const existing = await connection.getAccountInfo(config);
  if (existing) {
    const cfg = await program.account.config.fetch(config);
    if (!cfg.authority.equals(authority.publicKey)) {
      throw new Error(
        `Config already exists with different authority: ${cfg.authority.toBase58()}`
      );
    }
    console.log("Config already initialized — skipping initialize.");
    console.log("  total_matches:", cfg.totalMatches.toString());
    console.log("  total_players:", cfg.totalPlayers.toString());
  } else {
    console.log("Calling initialize...");
    const sig = await program.methods
      .initialize()
      .accounts({
        config,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      } as never)
      .rpc({ commitment: "confirmed" });
    console.log("  initialize tx:", sig);
  }

  console.log(`\nCalling register_characters with ${CHARACTER_NAMES.length} names...`);
  const sig = await program.methods
    .registerCharacters(CHARACTER_NAMES)
    .accounts({
      characterRegistry: registry,
      config,
      authority: authority.publicKey,
      systemProgram: SystemProgram.programId,
    } as never)
    .rpc({ commitment: "confirmed" });
  console.log("  register_characters tx:", sig);

  const reg = await program.account.characterRegistry.fetch(registry);
  console.log(`\nRegistry now has ${reg.characterCount} characters.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Initialization failed:");
  console.error(err);
  process.exit(1);
});
