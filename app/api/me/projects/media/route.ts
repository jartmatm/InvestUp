import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROJECT_MEDIA_BUCKET = 'project-media';
const MAX_FILES = 12;
const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/webp', 'video/webm'] as const;

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const sanitizeSegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const safeUserFolder = (userId: string) => sanitizeSegment(userId.replace(/\s+/g, '-')) || 'unknown-user';

const ensureProjectMediaBucket = async () => {
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Could not list storage buckets: ${listError.message}`);

  const existing = (buckets ?? []).find(
    (bucket) => bucket.id === PROJECT_MEDIA_BUCKET || bucket.name === PROJECT_MEDIA_BUCKET
  );
  if (existing) return;

  const { error: createError } = await supabase.storage.createBucket(PROJECT_MEDIA_BUCKET, {
    public: true,
    fileSizeLimit: String(MAX_FILE_SIZE_BYTES),
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });

  if (createError) throw new Error(`Could not create project media bucket: ${createError.message}`);
};

export async function POST(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 });
  }

  let verifiedUserId = '';
  try {
    const verified = await verifyPrivyAccessToken(accessToken);
    verifiedUserId = verified.userId;
  } catch {
    return jsonNoStore({ error: 'Invalid access token.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonNoStore({ error: 'Invalid upload payload.' }, { status: 400 });
  }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => typeof File !== 'undefined' && entry instanceof File);

  if (files.length === 0) {
    return jsonNoStore({ error: 'Attach at least one file.' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return jsonNoStore({ error: `You can upload up to ${MAX_FILES} files.` }, { status: 400 });
  }

  for (const file of files) {
    if (file.size <= 0) {
      return jsonNoStore({ error: `File "${file.name}" is empty.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonNoStore(
        { error: `File "${file.name}" exceeds the 60 MB limit.` },
        { status: 400 }
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      return jsonNoStore(
        { error: `File "${file.name}" type is not supported. Use WEBP images or WEBM videos.` },
        { status: 400 }
      );
    }
  }

  try {
    await ensureProjectMediaBucket();
    const supabase = getSupabaseAdminClient();
    const uploaded: Array<{ type: 'photo' | 'video'; publicUrl: string }> = [];
    const userFolder = safeUserFolder(verifiedUserId);
    const now = Date.now();

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const ext = file.type === 'video/webm' ? 'webm' : 'webp';
      const baseName = sanitizeSegment(file.name.replace(/\.[^/.]+$/, '')) || `media-${index + 1}`;
      const storagePath = `users/${userFolder}/${now}-${index + 1}-${baseName}.${ext}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(PROJECT_MEDIA_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Could not upload "${file.name}": ${uploadError.message}`);
      }

      const { data: publicData } = supabase.storage.from(PROJECT_MEDIA_BUCKET).getPublicUrl(storagePath);
      uploaded.push({
        type: file.type === 'video/webm' ? 'video' : 'photo',
        publicUrl: publicData.publicUrl,
      });
    }

    return jsonNoStore({ data: uploaded }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Project media upload failed.', details: message }, { status: 500 });
  }
}
