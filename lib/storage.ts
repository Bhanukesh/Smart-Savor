/**
 * Local file storage for uploaded receipts/photos — MVP stand-in for S3 (see
 * docs/Background/tech-stack.md §4, no S3 configured in this repo yet). Keys are returned
 * as relative paths and stored in the DB's `s3Key` columns; swapping in real S3 later means
 * replacing just these two functions, not the schema or the callers.
 */
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = path.join(process.cwd(), ".data", "uploads");

const EXT_BY_MEDIA_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function saveUpload(
  patientId: string,
  category: "receipts" | "lab-reports",
  base64: string,
  mediaType: string,
): Promise<string> {
  const ext = EXT_BY_MEDIA_TYPE[mediaType] ?? "bin";
  const key = `${patientId}/${category}/${randomUUID()}.${ext}`;
  const fullPath = path.join(STORAGE_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, Buffer.from(base64, "base64"));
  return key;
}

export async function readUpload(key: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_ROOT, key));
}
