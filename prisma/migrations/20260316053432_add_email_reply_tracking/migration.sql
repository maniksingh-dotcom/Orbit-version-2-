-- CreateTable
CREATE TABLE "EmailReply" (
    "id" TEXT NOT NULL,
    "emailThreadId" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailReply_emailThreadId_idx" ON "EmailReply"("emailThreadId");

-- CreateIndex
CREATE INDEX "EmailReply_emailMessageId_idx" ON "EmailReply"("emailMessageId");

-- AddForeignKey
ALTER TABLE "EmailReply" ADD CONSTRAINT "EmailReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
