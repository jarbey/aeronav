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

  /**
   * POST /api/auth/team
   * Add a new member to the current user's aeroclub (no password required).
   */
  app.post<{ Body: { email: string; firstName: string; lastName: string; role?: string } }>(
    "/auth/team", { preHandler: requireAuth },
    async (request, reply) => {
      const dbUser = (request as typeof request & { dbUser: { id: string; aeroclubId: string } }).dbUser;
      const { email, firstName, lastName, role = "Pilote" } = request.body;

      if (!email || !firstName || !lastName) {
        return reply.status(400).send({ error: "Bad Request", message: "email, firstName and lastName are required" });
      }

      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        return reply.status(409).send({ error: "Conflict", message: "An account with this email already exists" });
      }

      const user = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          aeroclubId: dbUser.aeroclubId,
          provider: "local",
        },
        include: { aeroclub: true },
      });

      return reply.status(201).send(serializeUser(user));
    }
  );

  /**
   * PATCH /api/auth/team/:id
   * Update a team member's name or role.
   */
  app.patch<{ Params: { id: string }; Body: { firstName?: string; lastName?: string; role?: string; license?: string; weightKg?: number; rolePref?: string } }>(
    "/auth/team/:id", { preHandler: requireAuth },
    async (request, reply) => {
      const dbUser = (request as typeof request & { dbUser: { id: string; aeroclubId: string } }).dbUser;
      const target = await prisma.user.findFirst({
        where: { id: request.params.id, aeroclubId: dbUser.aeroclubId },
      });
      if (!target) return reply.status(404).send({ error: "Not Found" });

      const { firstName, lastName, role, license, weightKg, rolePref } = request.body;
      const hasPersonData = license !== undefined || weightKg !== undefined || rolePref !== undefined;

      let personId = target.personId;

      if (hasPersonData) {
        if (personId) {
          // Update existing Person
          await prisma.person.update({
            where: { id: personId },
            data: {
              ...(firstName !== undefined && { firstName: firstName.trim() }),
              ...(lastName !== undefined && { lastName: lastName.trim() }),
              ...(license !== undefined && { license }),
              ...(weightKg !== undefined && { weightKg }),
              ...(rolePref !== undefined && { rolePref }),
            },
          });
        } else {
          // Create Person and link to User
          const person = await prisma.person.create({
            data: {
              firstName: (firstName ?? target.firstName).trim(),
              lastName: (lastName ?? target.lastName).trim(),
              aeroclubId: dbUser.aeroclubId,
              license: license ?? "",
              weightKg: weightKg ?? 75,
              rolePref: rolePref ?? "PAX",
              authorizedModels: [],
            },
          });
          personId = person.id;
        }
      }

      const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
          ...(firstName !== undefined && { firstName: firstName.trim() }),
          ...(lastName !== undefined && { lastName: lastName.trim() }),
          ...(role !== undefined && { role }),
          ...(personId !== target.personId && { personId }),
        },
        include: { aeroclub: true },
      });

      return reply.send(serializeUser(updated));
    }
  );

  /**
   * DELETE /api/auth/team/:id
   * Remove a member from the aeroclub (can't remove yourself).
   */
  app.delete<{ Params: { id: string } }>(
    "/auth/team/:id", { preHandler: requireAuth },
    async (request, reply) => {
      const dbUser = (request as typeof request & { dbUser: { id: string; aeroclubId: string } }).dbUser;
      if (request.params.id === dbUser.id) {
        return reply.status(400).send({ error: "Bad Request", message: "You cannot remove yourself" });
      }
      const target = await prisma.user.findFirst({
        where: { id: request.params.id, aeroclubId: dbUser.aeroclubId },
      });
      if (!target) return reply.status(404).send({ error: "Not Found" });

      await prisma.user.delete({ where: { id: target.id } });
      return reply.status(204).send();
    }
  );
}
