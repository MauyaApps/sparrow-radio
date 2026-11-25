// Sparrow account bearer-token authentication.
import { bearerFrom, TokenError, verifyAccessToken } from "./verify";

export interface AuthEnv {
  ACCOUNT_PUBLIC_KEY?: string;
  ACCOUNT_ISSUER?: string;
  ALLOW_DEV_AUTH?: string;
}

const keyCache = new Map<string, Uint8Array>();

function publicKey(b64u: string): Uint8Array {
  let key = keyCache.get(b64u);
  if (!key) {
    const padded = b64u.replaceAll("-", "+").replaceAll("_", "/");
    const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    key = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    keyCache.set(b64u, key);
  }
  return key;
}

export function userIdFromRequest(request: Request, env: AuthEnv, nowMs = Date.now()): string | null {
  const token = bearerFrom(request);
  if (token && env.ACCOUNT_PUBLIC_KEY && env.ACCOUNT_ISSUER) {
    try {
      return verifyAccessToken(token, publicKey(env.ACCOUNT_PUBLIC_KEY), {
        issuer: env.ACCOUNT_ISSUER,
        nowSec: Math.floor(nowMs / 1000),
      }).sub;
    } catch (error) {
      if (error instanceof TokenError) return null;
      throw error;
    }
  }
  if (env.ALLOW_DEV_AUTH === "true") return request.headers.get("x-sparrow-user");
  return null;
}
