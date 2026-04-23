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
    const customerId = formData.get('customerId') as string | null;
    const title = formData.get('title') as string | null;

    if (!file || !customerId) {
      return NextResponse.json(
        { error: 'file and customerId are required' },
        { status: 400 }
      );
    }

    const fileType = getFileType(file.type);
    if (!fileType) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not supported` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        userId: authResult.userId // Ensure user owns this customer
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const uniqueId = randomBytes(8).toString('hex');
    const safeName = sanitizeFilename(file.name);
    const filename = `${uniqueId}_${safeName}`;
    const storagePath = `${customerId}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { url, error: uploadError } = await uploadToStorage(storagePath, buffer, file.type);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

    const document = await prisma.document.create({
      data: {
        title: title?.trim() || file.name,
        filePath: storagePath,
        fileType,
        mimeType: file.type,
        customerId,
        uploadedBy: authResult.userId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}
