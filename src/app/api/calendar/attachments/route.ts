import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';
import { uploadToStorage, deleteFromStorage, sanitizeFilename } from '@/lib/fileUtils';
import { randomBytes } from 'crypto';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
};

type AttachmentRow = {
  id: string;
  eventId: string;
  filePath: string;
  publicUrl: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  createdAt: Date;
};

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }

  const userId = authResult.userId!;
  try {
    const rows = await prisma.$queryRaw<AttachmentRow[]>`
      SELECT id, "eventId", "filePath", "publicUrl", "fileName", "fileType", "mimeType", "createdAt"
      FROM "CalendarEventAttachment"
      WHERE "eventId" = ${eventId} AND "userId" = ${userId}
      ORDER BY "createdAt" ASC
    `;
    return NextResponse.json({ attachments: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Attachments GET] Error:', message);
    return NextResponse.json({ attachments: [] });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.userId!;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const eventId = formData.get('eventId') as string | null;

    if (!file || !eventId) {
      return NextResponse.json({ error: 'file and eventId are required' }, { status: 400 });
    }

    const fileType = ALLOWED_MIME[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not supported. Use JPEG, PNG, GIF, WebP, or PDF.` },
        { status: 400 }
      );
    }

    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 400 });
    }

    const uniqueId = randomBytes(8).toString('hex');
    const safeName = sanitizeFilename(file.name);
    const storagePath = `calendar-attachments/${userId}/${eventId}/${uniqueId}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, error: uploadError } = await uploadToStorage(storagePath, buffer, file.type);
    if (uploadError) {
      console.error('[Calendar Attachments POST] Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO "CalendarEventAttachment" (id, "eventId", "userId", "filePath", "publicUrl", "fileName", "fileType", "mimeType", "createdAt")
      VALUES (${id}, ${eventId}, ${userId}, ${storagePath}, ${url}, ${file.name}, ${fileType}, ${file.type}, ${now})
    `;

    const rows = await prisma.$queryRaw<AttachmentRow[]>`
      SELECT id, "eventId", "filePath", "publicUrl", "fileName", "fileType", "mimeType", "createdAt"
      FROM "CalendarEventAttachment"
      WHERE id = ${id}
      LIMIT 1
    `;

    // Auto-extract PDF text and save as searchable transcript
    if (file.type === 'application/pdf') {
      try {
        // unpdf bundles a browser-API-free pdfjs build — works in Node.js/Vercel serverless
        const { getDocumentProxy, extractText } = await import('unpdf');
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        const extractedText = (Array.isArray(text) ? text.join('\n') : text).trim();
        if (extractedText) {
          const existing = await prisma.calendarTranscript.findUnique({
            where: { eventId_userId: { eventId, userId } },
          });
          const newContent = existing?.content
            ? `${existing.content}\n\n--- From ${file.name} ---\n${extractedText}`
            : `--- From ${file.name} ---\n${extractedText}`;
          await prisma.calendarTranscript.upsert({
            where: { eventId_userId: { eventId, userId } },
            create: { eventId, userId, content: newContent, fileName: file.name },
            update: { content: newContent },
          });
        }
      } catch {
        // PDF extraction is best-effort — don't fail the upload if it errors
      }
    }

    return NextResponse.json({ attachment: rows[0] ?? null }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Attachments POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.userId!;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<{ filePath: string }[]>`
      SELECT "filePath" FROM "CalendarEventAttachment"
      WHERE id = ${id} AND "userId" = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deleteFromStorage(rows[0].filePath);
    await prisma.$executeRaw`
      DELETE FROM "CalendarEventAttachment" WHERE id = ${id} AND "userId" = ${userId}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Attachments DELETE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
