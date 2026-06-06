import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { readEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const KEY_SALT = "spotify-rater-listening-v1";

function getEncryptionKey(): Buffer {
  const secret =
    readEnv("LISTENING_TOKEN_SECRET") ?? readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) {
    throw new Error(
      "Set LISTENING_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY for listening sync."
    );
  }
  return scryptSync(secret, KEY_SALT, 32);
}

export function encryptRefreshToken(refreshToken: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptRefreshToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted refresh token payload");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
