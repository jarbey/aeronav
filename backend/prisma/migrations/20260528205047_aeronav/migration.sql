-- CreateTable
CREATE TABLE "aeroclubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "baseIcao" TEXT NOT NULL,

    CONSTRAINT "aeroclubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Pilote',
    "aeroclubId" TEXT NOT NULL,
    "personId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "aeroclubId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "license" TEXT NOT NULL,
    "authorizedModels" TEXT[],
    "rolePref" TEXT,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aircraft_models" (
    "id" TEXT NOT NULL,
    "aeroclubId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "cruiseKt" DOUBLE PRECISION NOT NULL,
    "burnLh" DOUBLE PRECISION NOT NULL,
    "fuelCapL" DOUBLE PRECISION NOT NULL,
    "massEmptyKg" DOUBLE PRECISION NOT NULL,
    "mtowKg" DOUBLE PRECISION NOT NULL,
    "mldwKg" DOUBLE PRECISION NOT NULL,
    "minRunwayM" INTEGER NOT NULL,
    "hourlyEUR" DOUBLE PRECISION NOT NULL,
    "icon" TEXT,

    CONSTRAINT "aircraft_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aircraft" (
    "id" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "callsign" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "aeroclubId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aerodromes" (
    "id" TEXT NOT NULL,
    "icao" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lngLat" DOUBLE PRECISION[],
    "elevationFt" INTEGER NOT NULL,
    "fuel" TEXT[],
    "night" BOOLEAN NOT NULL DEFAULT false,
    "ppr" BOOLEAN NOT NULL DEFAULT false,
    "atc" TEXT NOT NULL,
    "taxLanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxParking" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "aeroclubIds" TEXT[],

    CONSTRAINT "aerodromes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runways" (
    "id" TEXT NOT NULL,
    "aerodromeId" TEXT NOT NULL,
    "qfu" TEXT NOT NULL,
    "lengthM" INTEGER NOT NULL,
    "surface" TEXT NOT NULL,

    CONSTRAINT "runways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "aeroclubId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sharedWith" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "activeVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voyages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "voyageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weather" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT 'draft',
    "route" TEXT[],
    "stopMin" JSONB NOT NULL DEFAULT '[]',
    "cruiseAltFt" JSONB NOT NULL DEFAULT '[]',
    "crewsByLeg" JSONB NOT NULL DEFAULT '[]',
    "fuelLoadL" JSONB NOT NULL DEFAULT '[]',
    "bagsByLeg" JSONB NOT NULL DEFAULT '[]',
    "personOverrides" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aeroclubs_code_key" ON "aeroclubs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "aircraft_reg_key" ON "aircraft"("reg");

-- CreateIndex
CREATE UNIQUE INDEX "aerodromes_icao_key" ON "aerodromes"("icao");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_aeroclubId_fkey" FOREIGN KEY ("aeroclubId") REFERENCES "aeroclubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_aeroclubId_fkey" FOREIGN KEY ("aeroclubId") REFERENCES "aeroclubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft_models" ADD CONSTRAINT "aircraft_models_aeroclubId_fkey" FOREIGN KEY ("aeroclubId") REFERENCES "aeroclubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "aircraft_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_aeroclubId_fkey" FOREIGN KEY ("aeroclubId") REFERENCES "aeroclubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runways" ADD CONSTRAINT "runways_aerodromeId_fkey" FOREIGN KEY ("aerodromeId") REFERENCES "aerodromes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_aeroclubId_fkey" FOREIGN KEY ("aeroclubId") REFERENCES "aeroclubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
