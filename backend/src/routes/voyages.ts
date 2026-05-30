import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import {
  computeVoyage,
  computeFinance,
  computePilotDeltas,
  type VariantData,
  type ComputeData,
} from "../services/calculations.js";
import type { User, Aeroclub } from "@prisma/client";

type AuthedUser = User & { aeroclub: Aeroclub };

function getDbUser(request: Parameters<typeof requireAuth>[0]): AuthedUser {
  return (request as typeof request & { dbUser: AuthedUser }).dbUser;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const voyageCreateSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: z.enum(["draft", "planning", "ongoing", "completed"]).default("draft"),
});

const voyageUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["draft", "planning", "ongoing", "completed"]).optional(),
  sharedWith: z.array(z.string()).optional(),
  activeVariantId: z.string().nullable().optional(),
  aircraftIds: z.array(z.string()).optional(),
  peopleIds: z.array(z.string()).optional(),
  variantOrder: z.array(z.string()).optional(),
  personOverrides: z.record(z.object({ weightKg: z.number().optional(), authorizedModels: z.array(z.string()).optional(), rolePref: z.string().optional() })).optional(),
});

const variantCreateSchema = z.object({
  label: z.string().min(1),
  weather: z.string().default(""),
  tag: z.enum(["ok", "alt", "draft"]).default("draft"),
  route: z.array(z.string().min(2)).min(2),
  stopMin: z.array(z.number().int().nullable()).default([]),
  cruiseAltFt: z.array(z.number().int().nullable()).default([]),
  crewsByLeg: z.array(z.record(z.object({
    cdb: z.string().nullable(),
    pax: z.array(z.string()),
  }))).default([]),
  fuelLoadL: z.array(z.record(z.number())).default([]),
  bagsByLeg: z.array(z.record(z.object({
    count: z.number().int().nonnegative(),
    unitKg: z.number().nonnegative(),
  }))).default([]),
  personOverrides: z.record(z.object({
    weightKg: z.number().positive().optional(),
    authorizedModels: z.array(z.string()).optional(),
  })).default({}),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  taxiOutMin: z.array(z.number().int().nonnegative()).optional(),
  taxiInMin: z.array(z.number().int().nonnegative()).optional(),
  waypoints: z.array(z.array(z.tuple([z.number(), z.number()]))).optional(),
});

const variantUpdateSchema = variantCreateSchema.partial();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Asserts the requesting user can access the voyage:
 * - owner always has access
 * - sharedWith members get read+limited write access
 * Returns the voyage or throws 403/404.
 */
async function getVoyageForUser(voyageId: string, userId: string, aeroclubId: string) {
  const voyage = await prisma.voyage.findFirst({
    where: {
      id: voyageId,
      aeroclubId,
      OR: [
        { ownerId: userId },
        { sharedWith: { has: userId } },
      ],
    },
    include: { variants: true },
  });
  return voyage;
}

/**
 * Build ComputeData for a voyage (load all needed DB records).
 */
async function buildComputeData(aeroclubId: string): Promise<ComputeData> {
  const [aerodromes, aircraft, people] = await Promise.all([
    prisma.aerodrome.findMany({
      where: { aeroclubIds: { has: aeroclubId } },
      include: { runways: true },
    }),
    prisma.aircraft.findMany({
      where: { aeroclubId },
      include: { model: true },
    }),
    prisma.person.findMany({ where: { aeroclubId } }),
  ]);

  return { aerodromes, aircraft, people };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function voyagesRoutes(app: FastifyInstance): Promise<void> {
  const hooks = { preHandler: requireAuth };

  // ── Voyage CRUD ──────────────────────────────────────────────────────────

  /**
   * GET /api/voyages
   * List voyages the current user owns or is shared on.
   */
  app.get("/voyages", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const voyages = await prisma.voyage.findMany({
      where: {
        aeroclubId: user.aeroclubId,
        OR: [
          { ownerId: user.id },
          { sharedWith: { has: user.id } },
        ],
      },
      include: {
        variants: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { date: "desc" },
    });
    return reply.send(voyages);
  });

  /**
   * POST /api/voyages
   * Create a new voyage (initially no variants).
   */
  app.post<{ Body: z.infer<typeof voyageCreateSchema> }>("/voyages", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const parsed = voyageCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
    }

    const voyage = await prisma.voyage.create({
      data: {
        title: parsed.data.title,
        date: new Date(parsed.data.date),
        status: parsed.data.status,
        aeroclubId: user.aeroclubId,
        ownerId: user.id,
        sharedWith: [],
      },
      include: { variants: true, owner: { select: { id: true, firstName: true, lastName: true } } },
    });
    return reply.status(201).send(voyage);
  });

  /**
   * GET /api/voyages/:id
   * Get full voyage with all variants.
   */
  app.get<{ Params: { id: string } }>("/voyages/:id", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
    if (!voyage) return reply.status(404).send({ error: "Not Found" });
    return reply.send(voyage);
  });

  /**
   * PATCH /api/voyages/:id
   * Update title, date, status, sharedWith, or activeVariantId.
   * Only the owner may update sharedWith and status.
   */
  app.patch<{ Params: { id: string }; Body: z.infer<typeof voyageUpdateSchema> }>(
    "/voyages/:id",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
      if (!voyage) return reply.status(404).send({ error: "Not Found" });

      const parsed = voyageUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const isOwner = voyage.ownerId === user.id;

      // Only the owner can change status or sharedWith
      if ((parsed.data.status !== undefined || parsed.data.sharedWith !== undefined) && !isOwner) {
        return reply.status(403).send({ error: "Forbidden", message: "Only the owner can change status or sharing" });
      }

      // Validate sharedWith members belong to the same aeroclub
      if (parsed.data.sharedWith !== undefined) {
        const members = await prisma.user.findMany({
          where: { id: { in: parsed.data.sharedWith }, aeroclubId: user.aeroclubId },
          select: { id: true },
        });
        const validIds = members.map((m) => m.id);
        const invalid = parsed.data.sharedWith.filter((id) => !validIds.includes(id));
        if (invalid.length > 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: `These users are not members of your aeroclub: ${invalid.join(", ")}`,
          });
        }
      }

      const updateData: Record<string, unknown> = {};
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
      if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
      if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
      if (parsed.data.sharedWith !== undefined) updateData.sharedWith = parsed.data.sharedWith;
      if (parsed.data.activeVariantId !== undefined) updateData.activeVariantId = parsed.data.activeVariantId;
      if (parsed.data.aircraftIds !== undefined) updateData.aircraftIds = parsed.data.aircraftIds;
      if (parsed.data.variantOrder !== undefined) updateData.variantOrder = parsed.data.variantOrder;
      if (parsed.data.peopleIds !== undefined) updateData.peopleIds = parsed.data.peopleIds;
      if (parsed.data.personOverrides !== undefined) updateData.personOverrides = parsed.data.personOverrides;

      const updated = await prisma.voyage.update({
        where: { id: voyage.id },
        data: updateData,
        include: { variants: true },
      });
      return reply.send(updated);
    }
  );

  /**
   * DELETE /api/voyages/:id
   * Owner-only deletion.
   */
  app.delete<{ Params: { id: string } }>("/voyages/:id", hooks, async (request, reply) => {
    const user = getDbUser(request);
    const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
    if (!voyage) return reply.status(404).send({ error: "Not Found" });

    if (voyage.ownerId !== user.id) {
      return reply.status(403).send({ error: "Forbidden", message: "Only the owner can delete this voyage" });
    }

    await prisma.voyage.delete({ where: { id: voyage.id } });
    return reply.status(204).send();
  });

  // ── Variant CRUD ─────────────────────────────────────────────────────────

  /**
   * POST /api/voyages/:id/variants
   * Add a new variant to a voyage.
   */
  app.post<{ Params: { id: string }; Body: z.infer<typeof variantCreateSchema> }>(
    "/voyages/:id/variants",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
      if (!voyage) return reply.status(404).send({ error: "Not Found" });

      const parsed = variantCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const variant = await prisma.variant.create({
        data: {
          voyageId: voyage.id,
          label: parsed.data.label,
          weather: parsed.data.weather,
          tag: parsed.data.tag,
          route: parsed.data.route,
          stopMin: parsed.data.stopMin,
          cruiseAltFt: parsed.data.cruiseAltFt,
          crewsByLeg: parsed.data.crewsByLeg,
          fuelLoadL: parsed.data.fuelLoadL,
          bagsByLeg: parsed.data.bagsByLeg,
          personOverrides: parsed.data.personOverrides,
          ...(parsed.data.departureTime !== undefined && { departureTime: parsed.data.departureTime }),
          ...(parsed.data.taxiOutMin !== undefined && { taxiOutMin: parsed.data.taxiOutMin }),
          ...(parsed.data.taxiInMin !== undefined && { taxiInMin: parsed.data.taxiInMin }),
          ...(parsed.data.waypoints !== undefined && { waypoints: parsed.data.waypoints }),
        },
      });

      // If this is the first variant, set it as active
      if (!voyage.activeVariantId) {
        await prisma.voyage.update({
          where: { id: voyage.id },
          data: { activeVariantId: variant.id },
        });
      }

      return reply.status(201).send(variant);
    }
  );

  /**
   * PATCH /api/voyages/:id/variants/:variantId
   * Update a variant's route, crews, fuel, bags, or personOverrides.
   */
  app.patch<{
    Params: { id: string; variantId: string };
    Body: z.infer<typeof variantUpdateSchema>;
  }>(
    "/voyages/:id/variants/:variantId",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
      if (!voyage) return reply.status(404).send({ error: "Not Found" });

      const variant = voyage.variants.find((v) => v.id === request.params.variantId);
      if (!variant) return reply.status(404).send({ error: "Not Found" });

      const parsed = variantUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const updateData: Record<string, unknown> = {};
      const d = parsed.data;
      if (d.label !== undefined) updateData.label = d.label;
      if (d.weather !== undefined) updateData.weather = d.weather;
      if (d.tag !== undefined) updateData.tag = d.tag;
      if (d.route !== undefined) updateData.route = d.route;
      if (d.stopMin !== undefined) updateData.stopMin = d.stopMin;
      if (d.cruiseAltFt !== undefined) updateData.cruiseAltFt = d.cruiseAltFt;
      if (d.crewsByLeg !== undefined) updateData.crewsByLeg = d.crewsByLeg;
      if (d.fuelLoadL !== undefined) updateData.fuelLoadL = d.fuelLoadL;
      if (d.bagsByLeg !== undefined) updateData.bagsByLeg = d.bagsByLeg;
      if (d.personOverrides !== undefined) updateData.personOverrides = d.personOverrides;
      if (d.departureTime !== undefined) updateData.departureTime = d.departureTime;
      if (d.taxiOutMin !== undefined) updateData.taxiOutMin = d.taxiOutMin;
      if (d.taxiInMin !== undefined) updateData.taxiInMin = d.taxiInMin;
      if (d.waypoints !== undefined) updateData.waypoints = d.waypoints;

      const updated = await prisma.variant.update({
        where: { id: variant.id },
        data: updateData,
      });
      return reply.send(updated);
    }
  );

  /**
   * DELETE /api/voyages/:id/variants/:variantId
   * Delete a variant (owner only; can't delete last variant).
   */
  app.delete<{ Params: { id: string; variantId: string } }>(
    "/voyages/:id/variants/:variantId",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
      if (!voyage) return reply.status(404).send({ error: "Not Found" });

      if (voyage.ownerId !== user.id) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const variant = voyage.variants.find((v) => v.id === request.params.variantId);
      if (!variant) return reply.status(404).send({ error: "Not Found" });

      if (voyage.variants.length === 1) {
        return reply.status(409).send({
          error: "Conflict",
          message: "Cannot delete the last variant of a voyage",
        });
      }

      await prisma.variant.delete({ where: { id: variant.id } });

      // If active variant was deleted, switch to the first remaining one
      if (voyage.activeVariantId === variant.id) {
        const next = voyage.variants.find((v) => v.id !== variant.id);
        if (next) {
          await prisma.voyage.update({
            where: { id: voyage.id },
            data: { activeVariantId: next.id },
          });
        }
      }

      return reply.status(204).send();
    }
  );

  // ── Compute ──────────────────────────────────────────────────────────────

  /**
   * GET /api/voyages/:id/compute
   * Computes voyage results for the active variant (or ?variantId=).
   * Returns voyage totals, finance, and pilot deltas.
   */
  app.get<{ Params: { id: string }; Querystring: { variantId?: string } }>(
    "/voyages/:id/compute",
    hooks,
    async (request, reply) => {
      const user = getDbUser(request);
      const voyage = await getVoyageForUser(request.params.id, user.id, user.aeroclubId);
      if (!voyage) return reply.status(404).send({ error: "Not Found" });

      const targetVariantId = request.query.variantId ?? voyage.activeVariantId;
      const prismaVariant = targetVariantId
        ? voyage.variants.find((v) => v.id === targetVariantId)
        : voyage.variants[0];

      if (!prismaVariant) {
        return reply.status(422).send({ error: "Unprocessable Entity", message: "No variant found" });
      }

      // Cast Prisma JSON fields to the calculation engine's types
      const variant: VariantData = {
        id: prismaVariant.id,
        route: prismaVariant.route,
        stopMin: prismaVariant.stopMin as (number | null)[],
        cruiseAltFt: prismaVariant.cruiseAltFt as (number | null)[],
        crewsByLeg: prismaVariant.crewsByLeg as unknown as VariantData["crewsByLeg"],
        fuelLoadL: prismaVariant.fuelLoadL as unknown as VariantData["fuelLoadL"],
        bagsByLeg: prismaVariant.bagsByLeg as unknown as VariantData["bagsByLeg"],
        personOverrides: (prismaVariant.personOverrides ?? {}) as VariantData["personOverrides"],
      };

      const computeData = await buildComputeData(user.aeroclubId);

      let voyageResult;
      let financeResult;
      try {
        voyageResult = computeVoyage(variant, computeData);
        financeResult = computeFinance(variant, computeData);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(422).send({ error: "Computation Error", message });
      }

      const pilotDeltas = computePilotDeltas(financeResult);

      return reply.send({
        variantId: prismaVariant.id,
        variantLabel: prismaVariant.label,
        voyage: voyageResult,
        finance: financeResult,
        pilotDeltas,
      });
    }
  );
}
