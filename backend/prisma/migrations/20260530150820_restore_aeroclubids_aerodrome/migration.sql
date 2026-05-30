-- AlterTable (idempotent — column may already exist if migration was partially applied)
ALTER TABLE "aerodromes" ADD COLUMN IF NOT EXISTS "aeroclubIds" TEXT[];
