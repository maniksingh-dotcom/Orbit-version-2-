import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';

type TranscriptRow = {
  id: string;
  eventId: string;
  content: string;
  fileName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<TranscriptRow[]>`
      SELECT id, "eventId", content, "fileName", "createdAt", "updatedAt"
      FROM "CalendarTranscript"
      WHERE "eventId" = ${eventId} AND "userId" = ${authResult.userId!}
      LIMIT 1
    `;
    return NextResponse.json({ transcript: rows[0] ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Transcript GET] Error:', message);
    return NextResponse.json({ transcript: null });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const { eventId, content, fileName } = body as {
    eventId?: string;
    content?: string;
    fileName?: string;
  };

  if (!eventId || !content?.trim()) {
    return NextResponse.json({ error: 'eventId and content are required' }, { status: 400 });
  }

  const userId = authResult.userId!;
  const trimmedContent = content.trim();
  const fileNameVal = fileName || null;
  const now = new Date();
  const id = crypto.randomUUID();

  try {
    await prisma.$executeRaw`
      INSERT INTO "CalendarTranscript" (id, "eventId", "userId", content, "fileName", "createdAt", "updatedAt")
      VALUES (${id}, ${eventId}, ${userId}, ${trimmedContent}, ${fileNameVal}, ${now}, ${now})
      ON CONFLICT ("eventId", "userId")
      DO UPDATE SET
        content   = EXCLUDED.content,
        "fileName" = EXCLUDED."fileName",
        "updatedAt" = ${now}
    `;

    const rows = await prisma.$queryRaw<TranscriptRow[]>`
      SELECT id, "eventId", content, "fileName", "createdAt", "updatedAt"
      FROM "CalendarTranscript"
      WHERE "eventId" = ${eventId} AND "userId" = ${userId}
      LIMIT 1
    `;

    return NextResponse.json({ transcript: rows[0] ?? null }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Transcript POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
