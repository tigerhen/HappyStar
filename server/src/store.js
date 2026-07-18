import { randomUUID } from "node:crypto";
import { readFile, writeFile, rename, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { DATA_DIR, filePath } from "./paths.js";

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

const collectionQueues = new Map();

function serialize(name, operation) {
  const previous = collectionQueues.get(name) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  collectionQueues.set(name, current);
  return current.finally(() => {
    if (collectionQueues.get(name) === current) collectionQueues.delete(name);
  });
}

async function atomicWrite(name, data) {
  await ensureDir();
  const target = filePath(name);
  const tmp = `${target}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, target);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => {});
    throw error;
  }
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
  return serialize(name, () => atomicWrite(name, data));
}

export async function updateCollection(name, fallback, update) {
  return serialize(name, async () => {
    const current = await readCollection(name, fallback);
    const next = await update(current);
    await atomicWrite(name, next);
    return next;
  });
}
