-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "taxiInMin" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "taxiOutMin" JSONB NOT NULL DEFAULT '[]';
