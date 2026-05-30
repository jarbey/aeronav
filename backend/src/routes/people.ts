import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { serializePerson } from "../utils/serializers.js";
import type { User, Aeroclub } from "@prisma/client";

type AuthedUser = User & { aeroclub: Aeroclub };

function getDbUser(request: Parameters<typeof requireAuth>[0]): AuthedUser {
  return (request as typeof request & { dbUser: AuthedUser }).dbUser;
}

// Accept both frontend (first/last) and internal (firstName/lastName) naming
const personBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  first: z.string().min(1).optional(),
  last: z.string().min(1).optional(),
  weightKg: z.number().positive(),
  license: z.string(),
  authorizedModels: z.array(z.string()).default([]),
  rolePref: z.enum(["CDB", "PAX"]).optional(),
}).transform(d => ({
  firstName: d.firstName ?? d.first ?? '',
  lastName: d.lastName ?? d.last ?? '',
  weightKg: d.weightKg,
  license: d.license,
  authorizedModels: d.authorizedModels,
  rolePref: d.rolePref,
}));

const personUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  first: z.string().min(1).optional(),
  last: z.string().min(1).optional(),
  weightKg: z.number().positive().optional(),
  license: z.string().optional(),
  authorizedModels: z.array(z.string()).optional(),
  rolePref: z.enum(["CDB", "PAX"]).optional(),
}).transform(d => ({
  ...(d.firstName !== undefined || d.first !== undefined
    ? { firstName: d.firstName ?? d.first } : {}),
  ...(d.lastName !== undefined || d.last !== undefined
    ? { lastName: d.lastName ?? d.last } : {}),
  ...(d.weightKg !== undefined ? { weightKg: d.weightKg } : {}),
  ...(d.license !== undefined ? { license: d.license } : {}),
  ...(d.authorizedModels !== undefined ? { authorizedModels: d.authorizedModels } : {}),
  ...(d.rolePref !== undefined ? { rolePref: d.rolePref } : {}),
}));

export async function peopleRoutes(app: FastifyInstance): Promise<void> {
  const hooks = { preHandler: requireAuth };

  /**
   * GET /api/people
   * List all people in the current user's aeroclub.
   */
  app.get("/people", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const people = await prisma.person.findMany({
      where: { aeroclubId: user.aeroclubId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return reply.send(people.map(serializePerson));
  });

  /**
   * POST /api/people
   * Create a new person in the current user's aeroclub.
   */
  app.post<{ Body: z.infer<typeof personBodySchema> }>("/people", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const parsed = personBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
    }

    const person = await prisma.person.create({
      data: { ...parsed.data, aeroclubId: user.aeroclubId },
    });
    return reply.status(201).send(serializePerson(person));
  });

  /**
   * PATCH /api/people/:id
   * Update a person (aeroclub-scoped).
   */
  app.patch<{ Params: { id: string }; Body: z.infer<typeof personUpdateSchema> }>(
    "/people/:id",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const { id } = request.params;

      const existing = await prisma.person.findFirst({
        where: { id, aeroclubId: user.aeroclubId },
      });
      if (!existing) {
        return reply.status(404).send({ error: "Not Found" });
      }

      const parsed = personUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const updated = await prisma.person.update({
        where: { id },
        data: parsed.data,
      });
      return reply.send(serializePerson(updated));
    }
  );

  /**
   * DELETE /api/people/:id
   * Delete a person (aeroclub-scoped). Fails if linked to a user account.
   */
  app.delete<{ Params: { id: string } }>("/people/:id", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const { id } = request.params;

    const existing = await prisma.person.findFirst({
      where: { id, aeroclubId: user.aeroclubId },
    });
    if (!existing) {
      return reply.status(404).send({ error: "Not Found" });
    }

    // Prevent deletion if linked to a user account
    const linkedUser = await prisma.user.findFirst({ where: { personId: id } });
    if (linkedUser) {
      return reply.status(409).send({
        error: "Conflict",
        message: "This person is linked to a user account and cannot be deleted directly.",
      });
    }

    await prisma.person.delete({ where: { id } });
    return reply.status(204).send();
  });
}
