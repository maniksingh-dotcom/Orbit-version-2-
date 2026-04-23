import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { fetchFathomCalls } from '@/lib/fathom';

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || undefined;

  try {
    const response = await fetchFathomCalls(cursor, authResult.userId!);

    // Filter out Fathom demo meeting
    const items = response.items.filter(
      (m) => m.title !== 'Fathom Demo' && m.meeting_title !== 'Fathom Demo'
    );

    return NextResponse.json({
      items,
      next_cursor: response.next_cursor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
