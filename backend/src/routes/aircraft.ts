import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeAircraft, serializeAircraftModel } from "../utils/serializers.js";
import type { User, Aeroclub } from "@prisma/client";

type AuthedUser = User & { aeroclub: Aeroclub };

function getDbUser(request: Parameters<typeof requireAuth>[0]): AuthedUser {
  return (request as typeof request & { dbUser: AuthedUser }).dbUser;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const aircraftModelBodySchema = z.object({
  id: z.string().min(1).optional(),   // optional: client can provide a code key (e.g. "DR400-155")
  label: z.string().min(1),
  type: z.string().min(1),
  fuelType: z.string().min(1),
  seats: z.number().int().positive(),
  cruiseKt: z.number().positive(),
  burnLh: z.number().positive(),
  fuelCapL: z.number().positive(),
  mtowKg: z.number().positive(),
  mldwKg: z.number().positive(),
  minRunwayM: z.number().int().positive(),
  hourlyEUR: z.number().nonnegative(),
  icon: z.string().optional(),
});

const aircraftBodySchema = z.object({
  reg: z.string().min(1),
  callsign: z.string().min(1),
  modelId: z.string().min(1),
  color: z.string().min(1),
  massEmptyKg: z.number().nonnegative().default(0),
  burnLhOverride: z.number().positive().nullable().optional(),
  cruiseKtOverride: z.number().positive().nullable().optional(),
  notes: z.string().optional(),
});

const aircraftUpdateSchema = aircraftBodySchema.partial();
const modelUpdateSchema = aircraftModelBodySchema.partial();

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function aircraftRoutes(app: FastifyInstance): Promise<void> {
  const hooks = { preHandler: requireAuth };

  // ── Aircraft Models ──────────────────────────────────────────────────────

  /**
   * GET /api/aircraft-models
   * Return all models belonging to the current user's aeroclub.
   */
  app.get("/aircraft-models", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const models = await prisma.aircraftModel.findMany({
      where: { aeroclubId: user.aeroclubId },
      orderBy: { label: "asc" },
    });
    return reply.send(models.map(serializeAircraftModel));
  });

  /**
   * POST /api/aircraft-models
   */
  app.post<{ Body: z.infer<typeof aircraftModelBodySchema> }>(
    "/aircraft-models",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const parsed = aircraftModelBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const { id: clientId, ...rest } = parsed.data;
      const model = await prisma.aircraftModel.create({
        data: {
          ...(clientId ? { id: clientId } : {}),
          ...rest,
          aeroclubId: user.aeroclubId,
        },
      });
      return reply.status(201).send(serializeAircraftModel(model));
    }
  );

  /**
   * PATCH /api/aircraft-models/:id
   */
  app.patch<{ Params: { id: string }; Body: z.infer<typeof modelUpdateSchema> }>(
    "/aircraft-models/:id",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const { id } = request.params;

      const existing = await prisma.aircraftModel.findFirst({
        where: { id, aeroclubId: user.aeroclubId },
      });
      if (!existing) return reply.status(404).send({ error: "Not Found" });

      const parsed = modelUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const updated = await prisma.aircraftModel.update({ where: { id }, data: parsed.data });
      return reply.send(serializeAircraftModel(updated));
    }
  );

  // ── Aircraft ─────────────────────────────────────────────────────────────

  /**
   * GET /api/aircraft
   * Returns aircraft in the current user's aeroclub with model relation.
   */
  app.get("/aircraft", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const aircraft = await prisma.aircraft.findMany({
      where: { aeroclubId: user.aeroclubId },
      include: { model: true },
      orderBy: { callsign: "asc" },
    });
    return reply.send(aircraft.map(serializeAircraft));
  });

  /**
   * POST /api/aircraft
   */
  app.post<{ Body: z.infer<typeof aircraftBodySchema> }>("/aircraft", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const parsed = aircraftBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
    }

    // Ensure model belongs to the same aeroclub
    const model = await prisma.aircraftModel.findFirst({
      where: { id: parsed.data.modelId, aeroclubId: user.aeroclubId },
    });
    if (!model) {
      return reply.status(400).send({ error: "Bad Request", message: "Aircraft model not found in your aeroclub" });
    }

    // Check reg uniqueness
    const duplicate = await prisma.aircraft.findUnique({ where: { reg: parsed.data.reg } });
    if (duplicate) {
      return reply.status(409).send({ error: "Conflict", message: `Registration ${parsed.data.reg} already exists` });
    }

    const aircraft = await prisma.aircraft.create({
      data: { ...parsed.data, aeroclubId: user.aeroclubId },
      include: { model: true },
    });
    return reply.status(201).send(serializeAircraft(aircraft));
  });

  /**
   * PATCH /api/aircraft/:id
   */
  app.patch<{ Params: { id: string }; Body: z.infer<typeof aircraftUpdateSchema> }>(
    "/aircraft/:id",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const { id } = request.params;

      const existing = await prisma.aircraft.findFirst({
        where: { id, aeroclubId: user.aeroclubId },
      });
      if (!existing) return reply.status(404).send({ error: "Not Found" });

      const parsed = aircraftUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      if (parsed.data.modelId) {
        const model = await prisma.aircraftModel.findFirst({
          where: { id: parsed.data.modelId, aeroclubId: user.aeroclubId },
        });
        if (!model) {
          return reply.status(400).send({ error: "Bad Request", message: "Aircraft model not found in your aeroclub" });
        }
      }

      const updated = await prisma.aircraft.update({
        where: { id },
        data: parsed.data,
        include: { model: true },
      });
      return reply.send(serializeAircraft(updated));
    }
  );

  /**
   * DELETE /api/aircraft/:id
   */
  app.delete<{ Params: { id: string } }>("/aircraft/:id", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const { id } = request.params;

    const existing = await prisma.aircraft.findFirst({
      where: { id, aeroclubId: user.aeroclubId },
    });
    if (!existing) return reply.status(404).send({ error: "Not Found" });

    await prisma.aircraft.delete({ where: { id } });
    return reply.status(204).send();
  });
}
