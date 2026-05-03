// GameShift exposes two namespaces:
//   - POST /nx/users for registration (works fine, returns 201 / 409)
//   - GET  /users/{referenceId} for read (the /nx/ variant omits the wallet)
// The wallet field on the read endpoint is `address`, not `walletAddress`.
const GAMESHIFT_BASE = "https://api.gameshift.dev";

export class GameShiftError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GameShiftError";
  }
}

export interface GameShiftUser {
  address: string;
  referenceId?: string;
  email?: string;
}

function getApiKey(): string {
  const key = process.env.GAMESHIFT_API_KEY?.trim();
  if (!key) throw new Error("GAMESHIFT_API_KEY env var is required");
  return key;
}

async function readMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      if (typeof obj.message === "string") return obj.message;
      if (typeof obj.error === "string") return obj.error;
      return JSON.stringify(obj);
    }
    return String(body);
  } catch {
    try {
      return await res.text();
    } catch {
      return res.statusText;
    }
  }
}

function pickAddress(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const obj = body as Record<string, unknown>;
  if (typeof obj.address === "string" && obj.address) return obj.address;
  // Defensive: some legacy responses may still call it walletAddress.
  if (typeof obj.walletAddress === "string" && obj.walletAddress) {
    return obj.walletAddress;
  }
  return undefined;
}

/**
 * Returns the new user (with wallet address), or null if GameShift reports
 * a 409 conflict (caller should then call getUserByReferenceId).
 *
 * The POST /nx/users response may or may not include the wallet `address`
 * directly. If it doesn't, we follow up with a GET to fetch it.
 */
export async function registerUser(email: string): Promise<GameShiftUser | null> {
  const res = await fetch(`${GAMESHIFT_BASE}/nx/users`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ referenceId: email, email }),
  });

  console.log(`[gameshift] POST /nx/users -> ${res.status}`);

  if (res.status === 200 || res.status === 201) {
    const body = (await res.json()) as Record<string, unknown>;
    const address = pickAddress(body);
    if (address) {
      return { address, referenceId: email, email };
    }
    // POST succeeded but didn't include the wallet — fetch it.
    return await getUserByReferenceId(email);
  }
  if (res.status === 409) {
    return null;
  }
  throw new GameShiftError(res.status, await readMessage(res));
}

export async function getUserByReferenceId(referenceId: string): Promise<GameShiftUser> {
  const res = await fetch(
    `${GAMESHIFT_BASE}/users/${encodeURIComponent(referenceId)}`,
    {
      method: "GET",
      headers: { "x-api-key": getApiKey() },
    }
  );

  console.log(`[gameshift] GET /users/<ref> -> ${res.status}`);

  if (res.status === 200) {
    const body = (await res.json()) as Record<string, unknown>;
    const address = pickAddress(body);
    if (!address) {
      throw new GameShiftError(200, "wallet address not found in GameShift response");
    }
    return { address, referenceId, email: typeof body.email === "string" ? body.email : undefined };
  }
  throw new GameShiftError(res.status, await readMessage(res));
}
