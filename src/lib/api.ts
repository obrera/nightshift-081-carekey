export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const body = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body ? String((body as { error: unknown }).error) : response.statusText;
    throw new Error(message);
  }

  return body as T;
}

export function postJson<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(payload) });
}
