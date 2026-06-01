'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type UploadResult =
  | { data: Array<{ type: 'photo' | 'video'; publicUrl: string }>; error: null }
  | { data: null; error: string };

type UploadOptions = {
  onProgress?: (info: { index: number; total: number; fileName: string }) => void;
  timeoutMs?: number;
};

export async function uploadCurrentUserProjectMedia(
  getAccessToken: AccessTokenGetter,
  files: File[],
  options?: UploadOptions
): Promise<UploadResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { data: null, error: 'Missing Privy access token.' };
  }

  const uploaded: Array<{ type: 'photo' | 'video'; publicUrl: string }> = [];
  const timeoutMs = options?.timeoutMs ?? 90_000;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    options?.onProgress?.({ index: index + 1, total: files.length, fileName: file.name });
    const formData = new FormData();
    formData.append('files', file);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch('/api/me/projects/media', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (error) {
      window.clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          data: null,
          error: `Upload timed out for "${file.name}" after ${Math.round(timeoutMs / 1000)}s.`,
        };
      }

      return {
        data: null,
        error: `Network error while uploading "${file.name}".`,
      };
    }
    window.clearTimeout(timeout);

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
