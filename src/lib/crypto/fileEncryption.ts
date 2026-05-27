import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const VERSION = 0x01;
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;
function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY no definida (32 bytes en base64).");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) throw new Error(`ENCRYPTION_KEY inválida: se esperan ${KEY_BYTES} bytes.`);
  cachedKey = key;
  return key;
}

/** Cifra un buffer. Devuelve [1B version][12B iv][16B tag][ct]. */
export function encryptBuffer(plain: Buffer): Buffer {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ct]);
}

/** Descifra un blob de encryptBuffer. Lanza si el tag no valida (manipulación). */
export function decryptBuffer(blob: Buffer): Buffer {
  const key = loadKey();
  if (blob.length < 1 + IV_BYTES + TAG_BYTES) throw new Error("Blob cifrado demasiado corto.");
  if (blob[0] !== VERSION) throw new Error(`Versión de cifrado no reconocida: ${blob[0]}.`);
  const iv = blob.subarray(1, 1 + IV_BYTES);
  const tag = blob.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const ct = blob.subarray(1 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
