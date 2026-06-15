import { readCollection } from "../store.js";
import { verifyPin, createSession, deleteSession, getSession } from "../auth.js";
import { balance } from "../domain/points.js";

const COOKIE = "hs_sid";

export async function authRoutes(app) {
  app.post("/api/login", async (req, reply) => {
    const { role, childId, pin } = req.body || {};
    const config = await readCollection("config", null);
    const ttlMs = (config?.sessionTtlMinutes || 120) * 60 * 1000;

    if (role === "parent") {
      if (!verifyPin(pin, config.parentPinHash)) return reply.code(401).send({ error: "bad_pin" });
      const sid = createSession({ role: "parent" }, ttlMs);
      reply.setCookie(COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax" });
      return { role: "parent" };
    }
    if (role === "child") {
      const children = await readCollection("children", []);
      const child = children.find((c) => c.id === childId);
      if (!child || !verifyPin(pin, child.pinHash)) return reply.code(401).send({ error: "bad_pin" });
      const sid = createSession({ role: "child", childId }, ttlMs);
      reply.setCookie(COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax" });
      return { role: "child", childId };
    }
    return reply.code(400).send({ error: "bad_role" });
  });

  app.post("/api/logout", async (req, reply) => {
    const sid = req.cookies[COOKIE];
    if (sid) deleteSession(sid);
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/me", async (req, reply) => {
    const session = getSession(req.cookies[COOKIE]);
    if (!session) return reply.code(401).send({ error: "no_session" });
    if (session.role === "child") {
      const [events, children] = await Promise.all([
        readCollection("events", []),
        readCollection("children", []),
      ]);
      const child = children.find((c) => c.id === session.childId) || {};
      return {
        role: "child",
        childId: session.childId,
        balance: balance(events, session.childId),
        name: child.name,
        avatar: child.avatar,
        emoji: child.emoji,
        color: child.color,
      };
    }
    return { role: "parent" };
  });

  app.get("/api/children", async () => {
    const children = await readCollection("children", []);
    return children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar, emoji: c.emoji, color: c.color }));
  });
}
