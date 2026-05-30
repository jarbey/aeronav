-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "waypoints" JSONB NOT NULL DEFAULT '[]';
