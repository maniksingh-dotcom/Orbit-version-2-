import { supabaseAdmin, STORAGE_BUCKET } from './supabase';

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'audio/ogg': 'audio',
  'audio/opus': 'audio',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/x-m4a': 'audio',
  'audio/wav': 'audio',
  'audio/webm': 'audio',
};

export function getFileType(mimeType: string): string | null {
  return ALLOWED_MIME_TYPES[mimeType] ?? null;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 200);
}

/**
 * Upload file to Supabase Storage
 * @param filePath - Path in storage bucket (e.g., "customerId/filename.pdf")
 * @param fileBuffer - File buffer
 * @param mimeType - File MIME type
 * @returns Public URL of uploaded file
 */
export async function uploadToStorage(
  filePath: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ url: string; error: Error | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    return { url: '', error };
  }

  // Get public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return { url: publicUrlData.publicUrl, error: null };
}

/**
 * Download file from Supabase Storage
 * @param filePath - Path in storage bucket
 * @returns File buffer
 */
export async function downloadFromStorage(
  filePath: string
): Promise<{ data: Buffer | null; error: Error | null }> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(filePath);

  if (error || !data) {
    return { data: null, error: error || new Error('File not found') };
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return { data: buffer, error: null };
}

/**
 * Delete file from Supabase Storage
 * @param filePath - Path in storage bucket
 */
export async function deleteFromStorage(filePath: string): Promise<{ error: Error | null }> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([filePath]);

  return { error };
}
