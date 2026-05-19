import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY no definida (32 bytes en base64). Cifrado de campo no disponible.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY inválida: se esperan ${KEY_BYTES} bytes (base64), recibidos ${key.length}.`,
    );
  }
  cachedKey = key;
  return key;
}

/** Cifra texto plano. Devuelve "v1.<iv>.<tag>.<ct>" en base64url. */
export function encryptField(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

/** Descifra un payload de encryptField. Lanza si el tag no valida (manipulación). */
export function decryptField(payload: string): string {
  const parts = payload.split(".");
  const [v, ivB64, tagB64, ctB64] = parts;
  if (parts.length !== 4 || v !== VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error("Payload cifrado con formato/versión no reconocidos.");
  }
  const key = loadKey();
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ct = Buffer.from(ctB64, "base64url");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
