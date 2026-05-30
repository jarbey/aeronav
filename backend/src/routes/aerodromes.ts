import type { FastifyInstance } from "fastify";
import { z } from "zod";
import prisma from "../prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const runwaySchema = z.object({
  qfu: z.string().min(1),
  lengthM: z.number().int().positive(),
  surface: z.string().min(1),
});

const aerodromeBodySchema = z.object({
  icao: z.string().min(2).max(8).toUpperCase(),
  name: z.string().min(1),
  city: z.string().min(1),
  lngLat: z.tuple([z.number(), z.number()]),
  elevationFt: z.number().int(),
  fuel: z.array(z.string()).default([]),
  fuelSchedule: z.record(z.object({
    h24: z.boolean(),
    schedule: z.string().optional(),
  })).optional().nullable(),
  night: z.boolean().default(false),
  ppr: z.boolean().default(false),
  atc: z.string(),
  taxLanding: z.number().nonnegative().default(0),
  taxParking: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  runways: z.array(runwaySchema).default([]),
});

const aerodromeUpdateSchema = aerodromeBodySchema.partial();

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function aerodromesRoutes(app: FastifyInstance): Promise<void> {
  const hooks = { preHandler: requireAuth };

  /**
   * GET /api/aerodromes
   * Returns all aerodromes (no aeroclub scoping).
   */
  app.get("/aerodromes", hooks, async (_request, reply) => {
    const aerodromes = await prisma.aerodrome.findMany({
      include: { runways: true },
      orderBy: { icao: "asc" },
    });
    return reply.send(aerodromes);
  });

  /**
   * GET /api/aerodromes/catalog?q=<query>
   * Search all aerodromes by ICAO prefix, name, or city. Returns up to 20 results.
   */
  app.get<{ Querystring: { q?: string } }>(
    "/aerodromes/catalog",
    hooks,
    async (request, reply) => {
      const q = (request.query.q ?? "").trim();
      if (q.length < 2) return reply.send([]);

      const upper = q.toUpperCase();
      const results = await prisma.aerodrome.findMany({
        where: {
          OR: [
            { icao: { startsWith: upper } },
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { runways: true },
        orderBy: { icao: "asc" },
        take: 20,
      });

      return reply.send(results);
    }
  );

  /**
   * GET /api/aerodromes/:icao
   * Fetch a single aerodrome by ICAO code.
   */
  app.get<{ Params: { icao: string } }>("/aerodromes/:icao", hooks, async (request, reply) => {
    const icao = request.params.icao.toUpperCase();
    const aerodrome = await prisma.aerodrome.findUnique({
      where: { icao },
      include: { runways: true },
    });
    if (!aerodrome) return reply.status(404).send({ error: "Not Found" });
    return reply.send(aerodrome);
  });

  /**
   * POST /api/aerodromes
   * Create a new aerodrome. Returns 409 if the ICAO already exists.
   */
  app.post<{ Body: z.infer<typeof aerodromeBodySchema> }>("/aerodromes", hooks, async (request, reply) => {
    const parsed = aerodromeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
    }

    const { runways: runwayData, ...adData } = parsed.data;

    const existing = await prisma.aerodrome.findUnique({ where: { icao: adData.icao } });
    if (existing) {
      return reply.status(409).send({
        error: "Conflict",
        message: `Aerodrome ${adData.icao} already exists`,
      });
    }

    const { fuelSchedule: fs, ...adDataRest } = adData;
    const aerodrome = await prisma.aerodrome.create({
      data: {
        ...adDataRest,
        fuelSchedule: fs === null ? Prisma.DbNull : (fs as Prisma.InputJsonValue | undefined),
        runways: { create: runwayData },
      },
      include: { runways: true },
    });
    return reply.status(201).send(aerodrome);
  });

  /**
   * PATCH /api/aerodromes/:icao
   * Update an aerodrome by ICAO code.
   */
  app.patch<{ Params: { icao: string }; Body: z.infer<typeof aerodromeUpdateSchema> }>(
    "/aerodromes/:icao",
    hooks,
    async (request, reply) => {
      const icao = request.params.icao.toUpperCase();

      const existing = await prisma.aerodrome.findUnique({ where: { icao } });
      if (!existing) return reply.status(404).send({ error: "Not Found" });

      const parsed = aerodromeUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Bad Request", issues: parsed.error.issues });
      }

      const { runways: runwayData, ...adData } = parsed.data;

      if (runwayData !== undefined) {
        await prisma.runway.deleteMany({ where: { aerodromeId: existing.id } });
        await prisma.runway.createMany({
          data: runwayData.map((r) => ({ ...r, aerodromeId: existing.id })),
        });
      }

      const { fuelSchedule: fsUp, ...adDataUp } = adData;
      const updated = await prisma.aerodrome.update({
        where: { icao },
        data: {
          ...adDataUp,
          ...(fsUp !== undefined && { fuelSchedule: fsUp === null ? Prisma.DbNull : (fsUp as Prisma.InputJsonValue) }),
        },
        include: { runways: true },
      });
      return reply.send(updated);
    }
  );

  /**
   * DELETE /api/aerodromes/:icao
   * Delete an aerodrome entirely.
   */
  app.delete<{ Params: { icao: string } }>("/aerodromes/:icao", hooks, async (request, reply) => {
    const icao = request.params.icao.toUpperCase();

    const existing = await prisma.aerodrome.findUnique({ where: { icao } });
    if (!existing) return reply.status(404).send({ error: "Not Found" });

    await prisma.aerodrome.delete({ where: { icao } });
    return reply.status(204).send();
  });

  /**
   * GET /api/aerodromes/:icao/vac
   * Proxies the official SIA VAC PDF for the given ICAO code.
   */
  app.get<{ Params: { icao: string } }>("/aerodromes/:icao/vac", async (request, reply) => {
    const icao = request.params.icao.toUpperCase();

    const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const AIRAC_REF = new Date("2025-01-23T00:00:00Z");

    function airacDate(offset = 0): string {
      const now = Date.now();
      const daysSince = Math.floor((now - AIRAC_REF.getTime()) / 86_400_000);
      const cycleStart = new Date(AIRAC_REF.getTime() + (Math.floor(daysSince / 28) + offset) * 28 * 86_400_000);
      const d = cycleStart.getUTCDate().toString().padStart(2, "0");
      const m = MONTHS[cycleStart.getUTCMonth()];
      const y = cycleStart.getUTCFullYear();
      return `${d}_${m}_${y}`;
    }

    const siaBase = "https://www.sia.aviation-civile.gouv.fr/media/dvd";
    const pdfPath = `Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${icao}.pdf`;

    for (const offset of [0, -1]) {
      const cycle = airacDate(offset);
      const url = `${siaBase}/eAIP_${cycle}/${pdfPath}`;

      let siaRes: Response;
      try {
        siaRes = await fetch(url, { headers: { "User-Agent": "AeroNav/1.0" } });
      } catch {
        continue;
      }

      if (!siaRes.ok) continue;

      const buffer = await siaRes.arrayBuffer();
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `inline; filename="${icao}-VAC.pdf"`);
      reply.header("Cache-Control", "public, max-age=43200");
      return reply.send(Buffer.from(buffer));
    }

    return reply.status(404).send({ error: `No VAC found for ${icao} on SIA` });
  });
}
