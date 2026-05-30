-- AlterTable
ALTER TABLE "voyages" ADD COLUMN     "aircraftIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
