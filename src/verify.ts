// Проверка access-токена. Самодостаточный файл: радио и остальные продукты копируют его как есть.
// Зависимость одна: @noble/curves. Обращений к сервису аккаунтов не нужно, нужен только публичный ключ.
import { ed25519 } from "@noble/curves/ed25519.js";

export interface AccessClaims {
  iss: string;
  sub: string; // id пользователя
  sid: string; // id сессии
  iat: number;
  exp: number;
}

export class TokenError extends Error {}

function b64uDecode(s: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) throw new TokenError("bad encoding");
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseJson(b: Uint8Array): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(b));
    if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new TokenError("bad json");
  }
}

export function verifyAccessToken(
  token: string,
  publicKey: Uint8Array,
  opts: { issuer: string; nowSec: number; leewaySec?: number },
): AccessClaims {
  if (token.length > 1024) throw new TokenError("too long");
  const parts = token.split(".");
  if (parts.length !== 3) throw new TokenError("malformed");
  const [h, p, s] = parts as [string, string, string];

  const header = parseJson(b64uDecode(h));
  if (header.alg !== "EdDSA" || header.typ !== "JWT") throw new TokenError("unsupported alg"); // фиксированный alg, никакого "none"

  const sig = b64uDecode(s);
  if (sig.length !== 64) throw new TokenError("bad signature");
  let ok = false;
  try {
    ok = ed25519.verify(sig, new TextEncoder().encode(`${h}.${p}`), publicKey);
  } catch {
    ok = false;
  }
  if (!ok) throw new TokenError("bad signature");

  const c = parseJson(b64uDecode(p));
  const leeway = opts.leewaySec ?? 30;
  if (
    typeof c.iss !== "string" || typeof c.sub !== "string" || typeof c.sid !== "string" ||
    typeof c.iat !== "number" || typeof c.exp !== "number"
  ) throw new TokenError("bad claims");
  if (c.iss !== opts.issuer) throw new TokenError("wrong issuer");
  if (c.exp + leeway <= opts.nowSec) throw new TokenError("expired");
  if (c.iat - leeway > opts.nowSec) throw new TokenError("issued in the future");
  return { iss: c.iss, sub: c.sub, sid: c.sid, iat: c.iat, exp: c.exp };
}

export function bearerFrom(request: Request): string | null {
  const m = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get("authorization") ?? "");
  return m ? (m[1] as string) : null;
}
