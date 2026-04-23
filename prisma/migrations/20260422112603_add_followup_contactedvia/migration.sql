-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "contactedVia" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);
