import { NextRequest, NextResponse } from 'next/server';
import { downloadFromStorage } from '@/lib/fileUtils';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const storagePath = segments.join('/');

  try {
    // Download from Supabase Storage
    const { data: buffer, error } = await downloadFromStorage(storagePath);

    if (error || !buffer) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(storagePath).toLowerCase();

    const mimeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';

    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
