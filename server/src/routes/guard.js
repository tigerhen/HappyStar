import { getSession } from "../auth.js";

const COOKIE = "hs_sid";

export function requireSession(req, reply) {
  const session = getSession(req.cookies[COOKIE]);
  if (!session) {
    reply.code(401).send({ error: "no_session" });
    return null;
  }
  return session;
}

export function requireParent(req, reply) {
  const session = requireSession(req, reply);
  if (!session) return null;
  if (session.role !== "parent") {
    reply.code(403).send({ error: "parent_only" });
    return null;
  }
  return session;
}

export function requireChild(req, reply, childId) {
  const session = requireSession(req, reply);
  if (!session) return null;
  if (session.role !== "child" || (childId && session.childId !== childId)) {
    reply.code(403).send({ error: "child_only" });
    return null;
  }
  return session;
}