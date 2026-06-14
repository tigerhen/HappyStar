import Fastify from "fastify";
import cookie from "@fastify/cookie";
import fstatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { authRoutes } from "./routes/auth.routes.js";
import { childRoutes } from "./routes/child.routes.js";
import { parentRoutes } from "./routes/parent.routes.js";

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(here, "..", "..", "web", "dist");

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(childRoutes);
  app.register(parentRoutes);

  if (existsSync(WEB_DIST)) {
    app.register(fstatic, { root: WEB_DIST });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url.startsWith("/api/")) return reply.code(404).send({ error: "not_found" });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
