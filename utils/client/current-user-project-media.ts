'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type UploadResult =
  | { data: Array<{ type: 'photo' | 'video'; publicUrl: string }>; error: null }
  | { data: null; error: string };

export async function uploadCurrentUserProjectMedia(
  getAccessToken: AccessTokenGetter,
  files: File[]
): Promise<UploadResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const uploaded: Array<{ type: 'photo' | 'video'; publicUrl: string }> = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('files', file);

    const response = await fetch('/api/me/projects/media', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      cache: 'no-store',
    });

    const json = (await response.json().catch(() => null)) as
      | {
          data?: Array<{ type: 'photo' | 'video'; publicUrl: string }> | null;
          error?: string;
          details?: string | null;
        }
      | null;

    if (!response.ok) {
      const baseMessage = json?.error ?? `Project media upload failed for "${file.name}".`;
      return {
        data: null,
        error: json?.details ? `${baseMessage}: ${json.details}` : baseMessage,
      };
    }

    if (Array.isArray(json?.data)) {
      uploaded.push(...json.data);
    }
  }

  return { data: uploaded, error: null };
}
