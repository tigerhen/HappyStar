import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";

export function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(String(pin), salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, derived] = stored.split(":");
  const check = scryptSync(String(pin), salt, 32);
  const expected = Buffer.from(derived, "hex");
  return check.length === expected.length && timingSafeEqual(check, expected);
}

const sessions = new Map();

export function createSession(payload, ttlMs) {
  const id = randomUUID();
  sessions.set(id, { ...payload, expiresAt: Date.now() + ttlMs });
  return id;
}

export function getSession(id) {
  const s = sessions.get(id);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return s;
}

export function deleteSession(id) {
  sessions.delete(id);
}