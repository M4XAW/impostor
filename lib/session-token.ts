import { createHash, randomBytes } from "node:crypto";

export const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface PlayerSessionCredential {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidSessionToken(token: string) {
  return SESSION_TOKEN_PATTERN.test(token);
}

export function createPlayerSessionCredential(): PlayerSessionCredential {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000),
  };
}
