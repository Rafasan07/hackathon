export interface Profile {
  name: string;
  username: string;
  email: string;
}

interface AuthResponses {
  session: { user: Profile };
  register: { needsConfirmation: boolean };
  login: { user: Profile };
  confirm: { user: Profile };
  logout: { ok: true };
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

export async function api<Action extends keyof AuthResponses>(
  action: Action,
  data?: Record<string, FormDataEntryValue>,
  signal?: AbortSignal,
): Promise<AuthResponses[Action]> {
  const response = await fetch(`/api/auth/${action}`, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal,
  });
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string' ? result.error : undefined;
    throw new ApiError(message || (response.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'Unable to connect. Please try again.'), response.status);
  }
  return result as AuthResponses[Action];
}
