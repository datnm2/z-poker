const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3006";

type TokenGetter = () => Promise<string | null>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

export function createApiClient(getToken: TokenGetter) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new ApiError("Request timed out", 0, null);
      }
      throw new ApiError((err as Error).message || "Network error", 0, null);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        parsed = await res.text();
      }
      const msg =
        (parsed && typeof parsed === "object" && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : null) ?? res.statusText;
      throw new ApiError(msg, res.status, parsed);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function streamUrl(path: string, ticket: string): string {
  const url = new URL(`${API_URL}${path}`);
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

export async function fetchSseTicket(
  getToken: TokenGetter,
): Promise<string | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/sse-ticket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { ticket: string };
  return body.ticket;
}
