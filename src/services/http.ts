import { z } from 'zod';

import { env } from '@/constants/env';
import { strings } from '@/constants/strings';
import { authTokensSchema, type AuthTokens } from '@/features/auth/types';
import { readAuthSession, useAuthStore } from '@/store/authStore';

const errorResponseSchema = z
  .object({
    message: z.string().optional(),
    retryAfter: z.number().int().positive().optional(),
  })
  .passthrough();

const refreshResponseSchema = authTokensSchema;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface HttpRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  auth?: boolean;
}

async function responseBody(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new HttpError(strings.auth.invalidResponse, response.status);
  }
}

async function responseError(response: Response): Promise<HttpError> {
  let body: unknown;
  try {
    body = await responseBody(response);
  } catch (error) {
    if (error instanceof HttpError) return error;
    throw error;
  }

  const parsed = errorResponseSchema.safeParse(body);
  return new HttpError(
    parsed.success && parsed.data.message ? parsed.data.message : strings.auth.serverError,
    response.status,
    parsed.success ? parsed.data.retryAfter : undefined,
  );
}

async function fetchWithToken(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${env.apiUrl}${path}`, { ...init, headers });
}

async function refreshSession(): Promise<AuthTokens> {
  const session = await readAuthSession();
  if (!session) throw new HttpError(strings.auth.sessionExpired, 401);

  const response = await fetchWithToken('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  });
  if (!response.ok) throw await responseError(response);

  const parsed = refreshResponseSchema.safeParse(await responseBody(response));
  if (!parsed.success) throw new HttpError(strings.auth.invalidResponse, response.status);
  await useAuthStore.getState().updateTokens(parsed.data);
  return parsed.data;
}

let refreshInFlight: Promise<AuthTokens> | null = null;

async function getRefreshedSession(): Promise<AuthTokens> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw await responseError(response);
  return responseBody(response);
}

async function request(path: string, options: HttpRequestOptions = {}): Promise<unknown> {
  const { auth = true, ...init } = options;
  const session = auth ? await readAuthSession() : null;
  const response = await fetchWithToken(path, init, session?.tokens.accessToken);

  if (!auth || response.status !== 401) return parseResponse(response);

  let refreshed: AuthTokens;
  try {
    refreshed = await getRefreshedSession();
  } catch {
    await useAuthStore.getState().logout();
    throw new HttpError(strings.auth.sessionExpired, 401);
  }

  const retryResponse = await fetchWithToken(path, init, refreshed.accessToken);
  if (retryResponse.status === 401) {
    await useAuthStore.getState().logout();
    throw new HttpError(strings.auth.sessionExpired, 401);
  }
  return parseResponse(retryResponse);
}

export const http = { request };
