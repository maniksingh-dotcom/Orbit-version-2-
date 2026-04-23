import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { fetchRecordingDetails, fetchTranscript } from '@/lib/fathom';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeTranscript = searchParams.get('transcript') === '1';
  const recordingId = parseInt(id, 10);

  if (isNaN(recordingId)) {
    return NextResponse.json({ error: 'Invalid recording ID' }, { status: 400 });
  }

  try {
    if (includeTranscript) {
      // Transcript-only fetch
      const transcript = await fetchTranscript(recordingId, authResult.userId!);
      return NextResponse.json({ transcript });
    }

    // Default: summary + metadata only (fast)
    const details = await fetchRecordingDetails(recordingId, authResult.userId!);
    if (!details) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
