import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DATA_DIR, filePath } from "./paths.js";

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readCollection(name, fallback) {
  try {
    const raw = await readFile(filePath(name), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeCollection(name, data) {
  await ensureDir();
  const target = filePath(name);
  const tmp = `${target}.${process.pid}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, target);
}
