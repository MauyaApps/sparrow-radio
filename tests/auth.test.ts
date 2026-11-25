import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { userIdFromRequest } from "../src/auth";

const encode = (value: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

function token(secretKey: Uint8Array, claims: Record<string, unknown>) {
  const header = encode({ alg: "EdDSA", typ: "JWT" });
  const payload = encode(claims);
  const content = `${header}.${payload}`;
  const signature = ed25519.sign(new TextEncoder().encode(content), secretKey);
  return `${content}.${btoa(String.fromCharCode(...signature)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

describe("userIdFromRequest", () => {
  it("verifies account tokens and rejects a bad issuer", () => {
    const { secretKey, publicKey } = ed25519.keygen();
    const now = 1_800_000_000;
    const accessToken = token(secretKey, {
      iss: "https://accounts.example",
      sub: "user-123",
      sid: "session-456",
      iat: now,
      exp: now + 600,
    });
    const request = new Request("https://radio.example/graphql", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const env = {
      ACCOUNT_ISSUER: "https://accounts.example",
      ACCOUNT_PUBLIC_KEY: btoa(String.fromCharCode(...publicKey)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""),
    };

    expect(userIdFromRequest(request, env, now * 1000)).toBe("user-123");
    expect(userIdFromRequest(request, { ...env, ACCOUNT_ISSUER: "https://other.example" }, now * 1000)).toBeNull();
  });

  it("allows the spoofable development header only when explicitly enabled and never falls back from an invalid bearer token", () => {
    const request = new Request("https://radio.example/graphql", {
      headers: { "x-sparrow-user": "local-user" },
    });
    expect(userIdFromRequest(request, { ALLOW_DEV_AUTH: "false" })).toBeNull();
    expect(userIdFromRequest(request, { ALLOW_DEV_AUTH: "true" })).toBe("local-user");

    const invalidTokenRequest = new Request("https://radio.example/graphql", {
      headers: { authorization: "Bearer invalid.token.value", "x-sparrow-user": "local-user" },
    });
    expect(userIdFromRequest(invalidTokenRequest, {
      ALLOW_DEV_AUTH: "true",
      ACCOUNT_ISSUER: "https://accounts.example",
      ACCOUNT_PUBLIC_KEY: "AQ",
    })).toBeNull();
  });
});
