export class ApiError extends Error {
  status: number;
  /** The server's machine-readable reason, when it sends one (e.g. "totp_required"). */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** The envelope every dashboard-service route replies with. */
type ApiEnvelope<T> = { success: boolean; data?: T; message?: string; code?: string };

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    // Always hit the network. A list re-read after an upload must reflect it
    // without a hard reload.
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "Something went wrong. Please try again.",
      typeof body?.code === "string" ? body.code : undefined,
    );
  }

  return (body ?? { success: true }) as ApiEnvelope<T>;
}

/**
 * The bulk upload routes take the raw contents of a .txt bank file as the
 * request body, not JSON — `express.text()` on the server side reads the body
 * verbatim, so the Content-Type has to say text/plain and the body must not be
 * serialised.
 */
export async function apiUploadText<T>(
  url: string,
  text: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "text/plain",
      ...options.headers,
    },
    body: text,
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "The file could not be uploaded. Please try again.",
    );
  }

  return (body ?? { success: true }) as ApiEnvelope<T>;
}
