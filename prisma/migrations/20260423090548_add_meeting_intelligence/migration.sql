-- CreateTable
CREATE TABLE "MeetingIntelligence" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "customerId" TEXT,
    "sentiment" TEXT NOT NULL,
    "dealRisk" TEXT NOT NULL,
    "riskReasons" JSONB NOT NULL,
    "competitors" JSONB NOT NULL,
    "objections" JSONB NOT NULL,
    "keyTopics" JSONB NOT NULL,
    "nextStepConfirmed" BOOLEAN NOT NULL,
    "talkRatio" DOUBLE PRECISION,
    "excitement" INTEGER,
    "aiSummary" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingIntelligence_meetingId_key" ON "MeetingIntelligence"("meetingId");

-- AddForeignKey
ALTER TABLE "MeetingIntelligence" ADD CONSTRAINT "MeetingIntelligence_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "MeetingSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingIntelligence" ADD CONSTRAINT "MeetingIntelligence_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
