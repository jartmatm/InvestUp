import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import {
  KYC_ALLOWED_DOCUMENT_MIME_TYPES,
  KYC_DOCUMENT_LABELS,
  KYC_MAX_DOCUMENT_SIZE_BYTES,
  type KycDocumentType,
} from '@/utils/kyc/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KYC_BUCKET = 'kyc-documents';

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
};

const getDocumentType = (value: unknown): KycDocumentType | null => {
  if (value === 'identity_document') return 'identity_document';
  if (value === 'proof_of_residence') return 'proof_of_residence';
  return null;
};

const sanitizeFileSegment = (value: string) =>
  value.replace(/[^A-Za-z0-9._-]/g, '_');

const getSafeUserFolder = (userId: string) => Buffer.from(userId).toString('base64url');

const getFileExtension = (fileName: string, contentType: string) => {
  const fromName = fileName.split('.').pop()?.trim().toLowerCase() ?? '';
  if (fromName) return sanitizeFileSegment(fromName);
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
};

async function ensureKycBucket() {
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(listError.message);
  }

  const existing = (buckets ?? []).find((bucket) => bucket.id === KYC_BUCKET || bucket.name === KYC_BUCKET);
  if (existing) return;

  const { error: createError } = await supabase.storage.createBucket(KYC_BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: [...KYC_ALLOWED_DOCUMENT_MIME_TYPES],
  });

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(createError.message);
  }
}

export async function GET(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 });
  }

  let verified;
  try {
    verified = await verifyPrivyAccessToken(accessToken);
  } catch {
    return jsonNoStore({ error: 'Invalid access token.' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('document_type,file_name,status,created_at,updated_at')
      .eq('user_id', verified.userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return jsonNoStore(
        { error: 'Could not load KYC documents.', details: error.message },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: data ?? [] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'KYC document request failed.', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 });
  }

  let verified;
  try {
    verified = await verifyPrivyAccessToken(accessToken);
  } catch {
    return jsonNoStore({ error: 'Invalid access token.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonNoStore({ error: 'Invalid multipart form payload.' }, { status: 400 });
  }

  const documentType = getDocumentType(formData.get('documentType'));
  if (!documentType) {
    return jsonNoStore({ error: 'A valid documentType is required.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonNoStore({ error: 'A valid file is required.' }, { status: 400 });
  }

  if (file.size <= 0) {
    return jsonNoStore({ error: 'The selected file is empty.' }, { status: 400 });
  }

  if (file.size > KYC_MAX_DOCUMENT_SIZE_BYTES) {
    return jsonNoStore(
      { error: 'The selected file exceeds the 10 MB limit.' },
      { status: 400 }
    );
  }

  if (!KYC_ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as (typeof KYC_ALLOWED_DOCUMENT_MIME_TYPES)[number])) {
    return jsonNoStore(
      { error: 'Only PDF, JPG, PNG, and WEBP files are allowed.' },
      { status: 400 }
    );
  }

  try {
    await ensureKycBucket();

    const supabase = getSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from('kyc_documents')
      .select('file_name,storage_path')
      .eq('user_id', verified.userId)
      .eq('document_type', documentType)
      .maybeSingle();

    if (existingError) {
      return jsonNoStore(
        { error: 'Could not verify existing KYC document.', details: existingError.message },
        { status: 500 }
      );
    }

    if (existing?.storage_path) {
      await supabase.storage.from(KYC_BUCKET).remove([existing.storage_path]);
    }

    const extension = getFileExtension(file.name, file.type);
    const safeUserFolder = getSafeUserFolder(verified.userId);
    const storagePath = `users/${safeUserFolder}/${documentType}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(KYC_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return jsonNoStore(
        { error: 'Could not upload the KYC document.', details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: upserted, error: upsertError } = await supabase
      .from('kyc_documents')
      .upsert(
        {
          user_id: verified.userId,
          document_type: documentType,
          file_name: sanitizeFileSegment(file.name),
          storage_bucket: KYC_BUCKET,
          storage_path: storagePath,
          content_type: file.type,
          file_size_bytes: file.size,
          status: 'submitted',
          metadata: {
            uploaded_from: 'personal-data',
            document_label: KYC_DOCUMENT_LABELS[documentType],
          },
        },
        { onConflict: 'user_id,document_type' }
      )
      .select('document_type,file_name,status,created_at,updated_at')
      .maybeSingle();

    if (upsertError) {
      return jsonNoStore(
        { error: 'Could not save the KYC document record.', details: upsertError.message },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: upserted ?? null }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    return jsonNoStore({ error: 'KYC document upload failed.', details: message }, { status: 500 });
  }
}
