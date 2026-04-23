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

## Deploy

```
vercel deploy --prod
```

Set the same three env vars in the Vercel project settings (Production +
Preview). Function timeout is 30s (`vercel.json`).

## Security notes

- The authority secret key is **never** logged or returned in responses.
- The program enforces `has_one = authority` on `Config` — a leaked authority
  key is the only failure mode that lets someone forge match results.
- Players are passed as `UncheckedAccount` in every instruction; they cannot
  sign. This is intentional (gasless UX).
