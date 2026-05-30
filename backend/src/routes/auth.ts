import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../utils/serializers.js";

const loginSchema = z.object({
  email: z.string().email(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/login
   * Dev-mode: no password required, finds user by email.
   * Returns { user, token } where token is a signed JWT.
   */
  app.post<{ Body: { email: string } }>("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Bad Request", message: parsed.error.issues[0]?.message });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { aeroclub: true, person: true },
    });

    if (!user) {
      return reply.status(401).send({ error: "Unauthorized", message: "No account found for this email" });
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, aeroclubId: user.aeroclubId },
      { expiresIn: "7d" }
    );

    // Set httpOnly refresh cookie (same payload for now — can be a longer-lived token later)
    const refreshToken = app.jwt.sign(
      { id: user.id, email: user.email, type: "refresh" },
      { expiresIn: "30d" }
    );

    reply.setCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return reply.send({ user: serializeUser(user), token });
  });

  /**
   * GET /api/auth/me
   * Returns the authenticated user with aeroclub + person relations.
   */
  app.get("/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const dbUser = (request as typeof request & { dbUser: Awaited<ReturnType<typeof prisma.user.findUnique>> }).dbUser;

    const user = await prisma.user.findUnique({
      where: { id: dbUser!.id },
      include: { aeroclub: true, person: true },
    });
    if (!user) return reply.status(404).send({ error: "Not found" });

    return reply.send(serializeUser(user));
  });

  /**
   * POST /api/auth/logout
   * Clears the refresh token cookie.
   */
  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie("refreshToken", { path: "/api/auth" });
    return reply.send({ ok: true });
  });

  /**
   * POST /api/auth/refresh
   * Exchanges a valid refresh token cookie for a new access token.
   */
  app.post("/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies?.refreshToken;
    if (!refreshToken) {
      return reply.status(401).send({ error: "Unauthorized", message: "No refresh token" });
    }

    let payload: { id: string; email: string; type?: string };
    try {
      payload = app.jwt.verify<{ id: string; email: string; type?: string }>(refreshToken);
    } catch {
      return reply.status(401).send({ error: "Unauthorized", message: "Invalid refresh token" });
    }

    if (payload.type !== "refresh") {
      return reply.status(401).send({ error: "Unauthorized", message: "Not a refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized", message: "User not found" });
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, aeroclubId: user.aeroclubId },
      { expiresIn: "7d" }
    );

    return reply.send({ token });
  });

  /**
   * GET /api/auth/team
   * Returns all users in the current user's aeroclub.
   */
  app.get("/auth/team", { preHandler: requireAuth }, async (request, reply) => {
    const dbUser = (request as typeof request & { dbUser: { id: string; aeroclubId: string } }).dbUser;
    const users = await prisma.user.findMany({
      where: { aeroclubId: dbUser.aeroclubId },
      include: { aeroclub: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return reply.send(users.map(serializeUser));
  });
}
