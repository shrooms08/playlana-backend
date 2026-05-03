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
 * Returns the new user (with a populated wallet address), or null on a
 * 409 conflict (caller should then call getUserByReferenceId).
 *
 * The POST /nx/users response may NOT include the wallet `address` directly
 * (observed in production: response is empty/lacks address even though the
 * wallet exists and a subsequent GET returns it). When that happens, we
 * always follow up with a GET. If even the GET fails to produce an address,
 * we throw a 502 GameShiftError rather than ever returning an empty user.
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

  if (res.status === 409) {
    console.log(`[gameshift] POST /nx/users -> 409 (already exists)`);
    return null;
  }

  if (res.status !== 200 && res.status !== 201) {
    console.log(`[gameshift] POST /nx/users -> ${res.status} (error)`);
    throw new GameShiftError(res.status, await readMessage(res));
  }

  // 200/201 — try to read address from the POST body.
  let postAddress: string | undefined;
  try {
    const body = (await res.json()) as unknown;
    postAddress = pickAddress(body);
  } catch {
    postAddress = undefined;
  }
  console.log(
    `[gameshift] POST /nx/users responded ${res.status} — address present: ${!!postAddress}`
  );

  if (postAddress) {
    return { address: postAddress, referenceId: email, email };
  }

  // Always fall back to GET — POST succeeded, but body lacked the wallet.
  const fetched = await getUserByReferenceId(email);
  if (!fetched.address) {
    throw new GameShiftError(502, "wallet address not found after registration");
  }
  return fetched;
}

export async function getUserByReferenceId(referenceId: string): Promise<GameShiftUser> {
  const res = await fetch(
    `${GAMESHIFT_BASE}/users/${encodeURIComponent(referenceId)}`,
    {
      method: "GET",
      headers: { "x-api-key": getApiKey() },
    }
  );

  if (res.status !== 200) {
    console.log(`[gameshift] GET /users/<ref> -> ${res.status} (error)`);
    throw new GameShiftError(res.status, await readMessage(res));
  }

  let address: string | undefined;
  let bodyEmail: string | undefined;
  try {
    const body = (await res.json()) as Record<string, unknown>;
    address = pickAddress(body);
    if (typeof body.email === "string") bodyEmail = body.email;
  } catch {
    address = undefined;
  }
  console.log(`[gameshift] GET /users/<ref> -> 200 — address present: ${!!address}`);

  if (!address) {
    throw new GameShiftError(502, "wallet address not found in GameShift response");
  }
  return { address, referenceId, email: bodyEmail };
}
