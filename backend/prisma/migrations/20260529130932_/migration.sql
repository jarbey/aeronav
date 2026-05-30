/*
  Warnings:

  - You are about to drop the column `massEmptyKg` on the `aircraft_models` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "aircraft" ADD COLUMN     "massEmptyKg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "aircraft_models" DROP COLUMN "massEmptyKg";
