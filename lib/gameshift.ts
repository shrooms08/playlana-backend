const GAMESHIFT_BASE = "https://api.gameshift.dev/nx";

export class GameShiftError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GameShiftError";
  }
}

export interface GameShiftUser {
  walletAddress: string;
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

/**
 * Returns the new user, or null if GameShift reports a 409 conflict
 * (caller should then call getUserByReferenceId).
 */
export async function registerUser(email: string): Promise<GameShiftUser | null> {
  const res = await fetch(`${GAMESHIFT_BASE}/users`, {
    method: "POST",
    headers: {
      "x-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ referenceId: email, email }),
  });

  console.log(`[gameshift] POST /users -> ${res.status}`);

  if (res.status === 200 || res.status === 201) {
    const data = (await res.json()) as GameShiftUser;
    return data;
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
    return (await res.json()) as GameShiftUser;
  }
  throw new GameShiftError(res.status, await readMessage(res));
}
