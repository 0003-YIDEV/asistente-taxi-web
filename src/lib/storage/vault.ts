import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync, accessSync, constants } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { encryptBuffer, decryptBuffer, sha256 } from "@/lib/crypto/fileEncryption";

export function getStorageDir(): string {
  const raw = process.env.STORAGE_DIR || "./storage";
  const dir = path.resolve(process.cwd(), raw);
  mkdirSync(dir, { recursive: true });
  accessSync(dir, constants.W_OK); // lanza si no es escribible
  return dir;
}

// Garantiza que la ruta resuelta no se escapa de la bóveda (anti path-traversal).
function safeJoin(base: string, rel: string): string {
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) throw new Error("Ruta fuera de la bóveda.");
  return full;
}

export interface SavedFile {
  rutaRelativa: string;
  hash: string;
  tamano: number;
}

export function saveEncrypted(clientId: string, plain: Buffer): SavedFile {
  const dir = getStorageDir();
  const safeClient = clientId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeClient) throw new Error("clientId inválido.");
  const rutaRelativa = path.join(safeClient, `${randomUUID()}.enc`);
  const full = safeJoin(dir, rutaRelativa);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, encryptBuffer(plain));
  return { rutaRelativa, hash: sha256(plain), tamano: plain.length };
}

export function readEncrypted(rutaRelativa: string, expectedHash?: string): Buffer {
  const full = safeJoin(getStorageDir(), rutaRelativa);
  const plain = decryptBuffer(readFileSync(full));
  if (expectedHash && sha256(plain) !== expectedHash) throw new Error("Hash no coincide: posible manipulación.");
  return plain;
}

export function deleteFile(rutaRelativa: string): void {
  const full = safeJoin(getStorageDir(), rutaRelativa);
  if (existsSync(full)) unlinkSync(full);
}
