# PlayLana Backend

Bridge between the Unity WebGL game and the `playlana_core` Solana program.
Vercel serverless functions sign every transaction with the backend authority
keypair — players never sign (gasless model).

## Stack

- Node.js 20 + TypeScript
- `@coral-xyz/anchor` 0.32 + `@solana/web3.js`
- Vercel serverless functions (`@vercel/node` handler signature)
- Helius RPC

## Setup

1. Install deps (already pinned in `package.json`):
   ```
   npm install
   ```

2. Copy `.env.example` → `.env` and fill in:
   - `AUTHORITY_SECRET_KEY` — base58 string OR JSON array of 64 bytes (the format `solana-keygen new -o key.json` writes). This wallet pays all fees and is set as the program authority on first init.
   - `HELIUS_RPC_URL` — your Helius devnet endpoint.
   - `PROGRAM_ID` — defaults to `EQ2tfEf3XJbiCX7bsubCJUJLPBmkhWFiRXq7pjJQ59WV`.

3. Fund the authority wallet on devnet:
   ```
   solana airdrop 2 <authority-pubkey> --url devnet
   ```

## Initialize the program

One-time setup (idempotent — safe to re-run):

```
npx tsx scripts/initialize.ts
```

Calls `initialize` (skipped if already done) then `register_characters` with
the 20 characters. Logs the Config and CharacterRegistry PDAs.

## Endpoints

All endpoints are Vercel serverless functions in `api/`.

### `POST /api/submit-match`

Body:
```json
{
  "winnerWallet": "<base58>",
  "players": [
    { "wallet": "<base58>", "characterIndex": 0, "crownWins": 3 },
    { "wallet": "<base58>", "characterIndex": 5, "crownWins": 5 }
  ]
}
```

Flow (sequential, single request):
1. Validates 2-4 players, winner ∈ players, characterIndex 0-19, crownWins 0-255.
2. For each player without a `PlayerProfile`, calls `create_player_profile`.
3. Calls `submit_match_result`.
4. For each player, calls `update_player_stats` (winner gets `won_match=true`).

Response:
```json
{
  "matchId": "0",
  "matchAccount": "<base58>",
  "signatures": {
    "createProfile": { "<wallet>": "<sig>" },
    "submitMatch": "<sig>",
    "updateStats": { "<wallet>": "<sig>" }
  }
}
```

### `GET /api/player-profile?wallet=<base58>`

Returns the `PlayerProfile` for the wallet, or 404.

### `GET /api/match-history?limit=10&offset=0`

Newest first (sorted by `matchId` desc). `limit` capped at 50.

### `POST /api/register-wallet`

Provisions a Solana wallet for a player via GameShift, keyed by email.
Idempotent — calling twice with the same email returns the same wallet.

Body:
```json
{ "email": "alice@example.com" }
```

Response:
```json
{ "wallet": "<base58>", "isNewUser": true }
```

`isNewUser` is `false` when the email was already registered. Returns 400 on
invalid email, 502 on GameShift upstream failure (with `detail`).

Requires `GAMESHIFT_API_KEY` env var.

### `GET /api/leaderboard`

Returns the SOAR top-N leaderboard for Crown Royale (highest crowns first).

Response:
```json
{
  "leaderboard": "<base58>",
  "isAscending": false,
  "entries": [
    {
      "rank": 1,
      "soarPlayer": "<base58>",
      "wallet": "<base58 PlayLana wallet>",
      "score": "47",
      "timestamp": "1714780000"
    }
  ]
}
```

`wallet` is the original PlayLana (GameShift) wallet, mapped from the
deterministic SOAR identity. It can be `null` if a SOAR entry exists for a
player that no longer has a `PlayerProfile` on-chain.

Requires `SOAR_GAME_PUBKEY`, `SOAR_LEADERBOARD_PUBKEY`, `SOAR_PLAYER_SEED`.

## SOAR integration

PlayLana writes match results to its own Anchor program AND to a SOAR
leaderboard for cross-ecosystem visibility. See
https://docs.magicblock.gg/Build/Open-source-programs/SOAR.

**Lifetime totals, not per-match scores:** the leaderboard ranks players by
their lifetime crown total. Each player has at most one entry — submitting
a lower score after a higher one is silently a no-op. This is SOAR's
expected behavior with `allowMultipleScores: false`, not a bug.

**Gasless adaptation:** SOAR's `initializePlayer`/`registerPlayer` require
the player wallet to sign. Players in PlayLana don't sign (custodial
GameShift wallets), so we derive a deterministic per-player SOAR keypair
on the backend from `sha256(SOAR_PLAYER_SEED || playerWallet.toBytes())`.
The backend signs all SOAR ops as this derived key. The PlayLana wallet ↔
SOAR identity mapping is recomputed in `/api/leaderboard` so consumers see
the original PlayLana wallet.

**One-time setup** (idempotent — safe to re-run):

```
npx tsx scripts/init-soar.ts
```

The script will:
1. Print a fresh `SOAR_PLAYER_SEED` if it isn't already in `.env` — copy
   it back into `.env` and into Vercel env vars **before** any traffic
   hits `/api/submit-match` or `/api/leaderboard`. Changing this seed
   later orphans every existing SOAR identity.
2. Create the SOAR `Game` account (skip if `SOAR_GAME_PUBKEY` is already
   set and on-chain).
3. Create the leaderboard (skip if `SOAR_LEADERBOARD_PUBKEY` set).
4. Print the resulting pubkeys for you to add to `.env`.

**SOAR is non-blocking in `/api/submit-match`.** If SOAR submission throws,
the response still returns 200 with the playlana_core signatures and a
`soar: { submitted: false, error: "..." }` field. The match is already
recorded on-chain via `playlana_core` — SOAR is supplementary.

## CORS

All endpoints allow these origins (browser-callable from the Unity WebGL
build and the controller frontend):

- `https://play-lana.vercel.app`
- `http://localhost:3000`
- `http://localhost:5173`

`OPTIONS` preflight is handled in every endpoint.

## Deploy

```
vercel deploy --prod
```

Set the env vars in the Vercel project settings (Production + Preview):
`AUTHORITY_SECRET_KEY`, `HELIUS_RPC_URL`, `PROGRAM_ID`, `GAMESHIFT_API_KEY`,
`SOAR_GAME_PUBKEY`, `SOAR_LEADERBOARD_PUBKEY`, `SOAR_PLAYER_SEED`. Function
timeout is 30s (`vercel.json`).

## Security notes

- The authority secret key is **never** logged or returned in responses.
- The program enforces `has_one = authority` on `Config` — a leaked authority
  key is the only failure mode that lets someone forge match results.
- Players are passed as `UncheckedAccount` in every instruction; they cannot
  sign. This is intentional (gasless UX).
