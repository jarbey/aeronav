/**
 * AeroNav Backend — Fastify 4 entry point
 */
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

import { authRoutes } from "./routes/auth.js";
import { voyagesRoutes } from "./routes/voyages.js";
import { peopleRoutes } from "./routes/people.js";
import { aircraftRoutes } from "./routes/aircraft.js";
import { aerodromesRoutes } from "./routes/aerodromes.js";
import prisma from "./prisma/client.js";

// ─── Environment ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET ?? "aeronav-dev-secret-change-in-production";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV ?? "development";

// ─── Server ───────────────────────────────────────────────────────────────────

const app = Fastify({
  logger: {
    level: NODE_ENV === "production" ? "warn" : "info",
    transport:
      NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

// ─── Plugins ─────────────────────────────────────────────────────────────────

await app.register(fastifyCors, {
  origin: NODE_ENV === "production" ? [FRONTEND_URL] : true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(fastifyCookie, {
  secret: JWT_SECRET, // cookie signing secret
});

await app.register(fastifyJwt, {
  secret: JWT_SECRET,
  cookie: {
    cookieName: "refreshToken",
    signed: false,
  },
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", async (_req, reply) => {
  return reply.send({ status: "ok", ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

await app.register(authRoutes, { prefix: "/api" });
await app.register(voyagesRoutes, { prefix: "/api" });
await app.register(peopleRoutes, { prefix: "/api" });
await app.register(aircraftRoutes, { prefix: "/api" });
await app.register(aerodromesRoutes, { prefix: "/api" });

// ─── Global error handler ─────────────────────────────────────────────────────

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    error: error.name ?? "Internal Server Error",
    message: error.message,
    ...(NODE_ENV !== "production" && { stack: error.stack }),
  });
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Received ${signal} — shutting down gracefully`);
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// ─── Start ───────────────────────────────────────────────────────────────────

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`AeroNav backend listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  await prisma.$disconnect();
  process.exit(1);
}
