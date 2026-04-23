import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';
import { downloadFromStorage } from '@/lib/fileUtils';

// POST /api/calendar/attachments/extract
// Body: { attachmentId: string }
// Downloads the PDF from Supabase Storage, extracts text, saves as CalendarTranscript.
export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.userId!;
  const { attachmentId } = await request.json();

  if (!attachmentId) {
    return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 });
  }

  // Fetch attachment record
  const rows = await prisma.$queryRaw<
    { id: string; eventId: string; filePath: string; fileName: string; mimeType: string }[]
  >`
    SELECT id, "eventId", "filePath", "fileName", "mimeType"
    FROM "CalendarEventAttachment"
    WHERE id = ${attachmentId} AND "userId" = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  const { eventId, filePath, fileName, mimeType } = rows[0];

  if (mimeType !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDFs can be extracted' }, { status: 400 });
  }

  // Download from Supabase Storage
  const { data: fileBuffer, error: downloadError } = await downloadFromStorage(filePath);
  if (downloadError || !fileBuffer) {
    return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 });
  }

  try {
    // unpdf bundles a browser-API-free build of pdfjs-dist — works in Node.js/Vercel serverless
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const extractedText = (Array.isArray(text) ? text.join('\n') : text).trim();

    if (!extractedText) {
      return NextResponse.json({ error: 'No text found in PDF' }, { status: 422 });
    }

    const existing = await prisma.calendarTranscript.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    const newContent = existing?.content
      ? `${existing.content}\n\n--- From ${fileName} ---\n${extractedText}`
      : `--- From ${fileName} ---\n${extractedText}`;

    await prisma.calendarTranscript.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, content: newContent, fileName },
      update: { content: newContent },
    });

    return NextResponse.json({ ok: true, chars: extractedText.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF extraction failed';
    console.error('[PDF Extract] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
