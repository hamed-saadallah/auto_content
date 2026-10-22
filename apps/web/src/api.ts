import type { Content, ContentType, IntegrationStatus, PublishChannel } from './types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function resolve(path: string): string {
  return `${API_BASE}${path}`;
}

export function assetUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return resolve(path);
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(resolve(path), { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { message?: string | string[] }).message ||
      response.statusText ||
      'Request failed';
    throw new ApiError(Array.isArray(message) ? message.join(', ') : String(message), response.status, data);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string } }>('/api/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) => request<{ id: string; email: string }>('/api/auth/me', token),
  integrations: (token: string) => request<IntegrationStatus>('/api/integrations/status', token),
  list: (token: string, type?: ContentType) =>
    request<Content[]>(type ? `/api/contents?type=${type}` : '/api/contents', token),
  get: (token: string, id: string) => request<Content>(`/api/contents/${id}`, token),
  create: (
    token: string,
    body: { type: ContentType; sujet: string; audience?: string; objectif?: string; generate?: boolean },
  ) => request<Content>('/api/contents', token, { method: 'POST', body: JSON.stringify(body) }),
  update: (token: string, id: string, body: Partial<Content>) =>
    request<Content>(`/api/contents/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) }),
  generate: (token: string, id: string) =>
    request<Content>(`/api/contents/${id}/generate`, token, { method: 'POST' }),
  revise: (token: string, id: string, instruction: string) =>
    request<Content>(`/api/contents/${id}/revise`, token, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    }),
  approve: (token: string, id: string) =>
    request<Content>(`/api/contents/${id}/approve`, token, { method: 'POST' }),
  publish: (token: string, id: string, channel: PublishChannel, dryRun?: boolean) =>
    request<{ content: Content }>(`/api/contents/${id}/publish`, token, {
      method: 'POST',
      body: JSON.stringify({ channel, dryRun: Boolean(dryRun) }),
    }),
};
