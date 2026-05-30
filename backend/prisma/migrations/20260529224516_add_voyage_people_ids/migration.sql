-- AlterTable
ALTER TABLE "voyages" ADD COLUMN     "peopleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
