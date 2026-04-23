-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "taskType" TEXT NOT NULL DEFAULT 'todo';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "leadStatus" TEXT NOT NULL DEFAULT 'warm',
ADD COLUMN     "pipelineStage" TEXT NOT NULL DEFAULT 'new';
