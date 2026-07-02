import path from "node:path";
import fs from "node:fs";

export const uploadsRoot = path.join(process.cwd(), "uploads");

export function albumDir(slug: string) {
  const dir = path.join(uploadsRoot, slug);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
