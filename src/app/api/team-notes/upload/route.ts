import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';
import { getFileType, sanitizeFilename, uploadToStorage } from '@/lib/fileUtils';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const content = formData.get('content') as string | null;
    const customerId = formData.get('customerId') as string | null;
    const groupId = formData.get('groupId') as string | null;

    if (!file && !content?.trim()) {
      return NextResponse.json({ error: 'File or content is required' }, { status: 400 });
    }

    let attachmentData: { filePath: string; fileName: string; fileType: string; mimeType: string } | null = null;

    if (file) {
      const fileType = getFileType(file.type);
      if (!fileType) {
        return NextResponse.json({ error: `File type "${file.type}" is not supported` }, { status: 400 });
      }

      const uniqueId = randomBytes(8).toString('hex');
      const safeName = sanitizeFilename(file.name);
      const filename = `${uniqueId}_${safeName}`;
      const storagePath = `team-notes/${filename}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      // Upload to Supabase Storage
      const { error: uploadError } = await uploadToStorage(storagePath, buffer, file.type);

      if (uploadError) {
        console.error('Team note file upload error:', uploadError);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
      }

      attachmentData = {
        filePath: storagePath,
        fileName: file.name,
        fileType,
        mimeType: file.type,
      };
    }

    const noteContent = content?.trim() || (file ? `Shared a file: ${file.name}` : '');

    const note = await prisma.teamNote.create({
      data: {
        content: noteContent,
        userId: authResult.userId!,
        customerId: customerId || null,
        groupId: groupId || null,
        ...(attachmentData ? {
          attachments: {
            create: attachmentData,
          },
        } : {}),
      },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        attachments: true,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Team note upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
