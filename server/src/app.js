import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.routes.js";
import { childRoutes } from "./routes/child.routes.js";

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(childRoutes);
  return app;
}
