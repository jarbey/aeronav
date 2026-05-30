import type { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../prisma/client.js";

/**
 * Fastify preHandler: verifies JWT from Authorization: Bearer <token>
 * Attaches full user record to request as `request.user`.
 * Returns 401 if token is missing, invalid, or user not found.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // @fastify/jwt attaches .jwtVerify() to the request
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized", message: "Invalid or missing token" });
  }

  const payload = request.user as { id: string; email: string };
  if (!payload?.id) {
    return reply.status(401).send({ error: "Unauthorized", message: "Invalid token payload" });
  }

  // Hydrate full user from DB so routes always get a fresh record
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { aeroclub: true },
  });

  if (!user) {
    return reply.status(401).send({ error: "Unauthorized", message: "User not found" });
  }

  // Re-attach the full user so route handlers can do `request.user`
  (request as FastifyRequest & { dbUser: typeof user }).dbUser = user;
}
