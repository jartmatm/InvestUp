'use client';

type AccessTokenGetter = () => Promise<string | null | undefined>;

type UploadResult =
  | { data: Array<{ type: 'photo' | 'video'; publicUrl: string }>; error: null }
  | { data: null; error: string };

type UploadOptions = {
  onProgress?: (info: {
    index: number;
    total: number;
    fileName: string;
    phase: 'starting' | 'uploading' | 'retrying' | 'completed';
    attempt: number;
    elapsedSeconds?: number;
  }) => void;
  timeoutMs?: number;
  maxRetries?: number;
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
  const maxRetries = options?.maxRetries ?? 2;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    options?.onProgress?.({
      index: index + 1,
      total: files.length,
      fileName: file.name,
      phase: 'starting',
      attempt: 1,
    });

    let response: Response | null = null;
    let lastNetworkError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const formData = new FormData();
      formData.append('files', file);
      const controller = new AbortController();
      const startedAt = Date.now();
      const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
      const heartbeat = window.setInterval(() => {
        options?.onProgress?.({
          index: index + 1,
          total: files.length,
          fileName: file.name,
          phase: 'uploading',
          attempt: attempt + 1,
          elapsedSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        });
      }, 5000);

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
        window.clearTimeout(timeout);
        window.clearInterval(heartbeat);
        break;
      } catch (error) {
        window.clearTimeout(timeout);
        window.clearInterval(heartbeat);
        const isTimeout = error instanceof DOMException && error.name === 'AbortError';
        lastNetworkError = isTimeout
          ? `Upload timed out for "${file.name}" after ${Math.round(timeoutMs / 1000)}s.`
          : `Network error while uploading "${file.name}".`;

        if (attempt < maxRetries) {
          options?.onProgress?.({
            index: index + 1,
            total: files.length,
            fileName: file.name,
            phase: 'retrying',
            attempt: attempt + 2,
          });
          await new Promise((resolve) => window.setTimeout(resolve, 650 * (attempt + 1)));
          continue;
        }

        return {
          data: null,
          error: lastNetworkError,
        };
      }
    }

    if (!response) {
      return {
        data: null,
        error: lastNetworkError || `Network error while uploading "${file.name}".`,
      };
    }

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

    options?.onProgress?.({
      index: index + 1,
      total: files.length,
      fileName: file.name,
      phase: 'completed',
      attempt: 1,
    });
  }

  return { data: uploaded, error: null };
}
