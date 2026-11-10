import { z } from 'zod';
import { fetch as expoFetch } from 'expo/fetch';

import { env } from '@/constants/env';
import { strings } from '@/constants/strings';
import { readAuthSession, useAuthStore } from '@/store/authStore';

const errorResponseSchema = z
  .object({
    message: z.string().optional(),
    retryAfter: z.number().int().positive().optional(),
  })
  .passthrough();

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
  useExpoFetch = false,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${env.apiUrl}${path}`;
  const request = { ...init, headers };
  return useExpoFetch ? expoFetch(url, request) : fetch(url, request);
}

async function parseResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw await responseError(response);
  return responseBody(response);
}

async function request(
  path: string,
  options: HttpRequestOptions = {},
  useExpoFetch = false,
): Promise<unknown> {
  const { auth = true, ...init } = options;
  const session = auth ? await readAuthSession() : null;
  if (auth && !session) throw new HttpError(strings.auth.sessionExpired, 401);

  const response = await fetchWithToken(path, init, session?.accessToken, useExpoFetch);
  if (auth && response.status === 401) {
    await useAuthStore.getState().logout();
    throw new HttpError(strings.auth.sessionExpired, 401);
  }
  return parseResponse(response);
}

async function uploadFile(
  path: string,
  file: Blob,
  fileName: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const body = new FormData();
  body.append('file', file, fileName);
  return request(path, { method: 'POST', body, signal }, true);
}

export const http = { request, uploadFile };
