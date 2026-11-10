import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http, HttpError } from '@/services/http';

import { accessTokenSchema, type AccessToken } from './types';

const phoneSchema = z.string().regex(/^09\d{9}$/);

const sendOtpResponseSchema = z
  .object({
    statusCode: z.number().int().positive(),
    message: z.string(),
    data: z
      .object({ code: z.string().optional() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const verifyOtpResponseSchema = z
  .object({
    statusCode: z.number().int().positive(),
    message: z.string(),
    data: z
      .object({
        accessToken: accessTokenSchema,
        user: z
          .object({
            id: z.number().int(),
            mobile: z.string(),
            name: z.string(),
            family: z.string(),
            status: z.string(),
            roles: z.array(z.string()),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export interface VerifyOtpResponse {
  accessToken: AccessToken;
}

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

export function normalizePhone(value: string): string {
  return normalizeDigits(value);
}

export async function sendOtp(phone: string): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  if (!phoneSchema.safeParse(normalizedPhone).success) {
    throw new Error(strings.auth.phoneInvalid);
  }

  const response = await http.request('/auth/login', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: normalizedPhone }),
  });
  if (!sendOtpResponseSchema.safeParse(response).success) {
    throw new Error(strings.auth.invalidResponse);
  }
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedCode = normalizeDigits(code);
  if (!phoneSchema.safeParse(normalizedPhone).success) {
    throw new Error(strings.auth.phoneInvalid);
  }
  if (!/^\d{5}$/.test(normalizedCode)) {
    throw new Error(strings.auth.codeInvalid);
  }

  const response = await http.request('/auth/verify', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: normalizedPhone, code: normalizedCode }),
  });
  const parsed = verifyOtpResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return { accessToken: parsed.data.data.accessToken };
}

export async function logoutFromServer(): Promise<void> {
  await http.request('/auth/logout', { method: 'GET' });
}

export function getAuthErrorMessage(
  error: unknown,
  fallback: string = strings.auth.serverError,
): string {
  if (error instanceof HttpError) {
    if (error.status === 429) return strings.auth.requestLimit(error.retryAfter ?? 60);
    return error.message || fallback;
  }
  if (
    error instanceof Error &&
    Object.values(strings.auth).some(
      (message) => typeof message === 'string' && message === error.message,
    )
  ) {
    return error.message;
  }
  return fallback;
}

export { HttpError } from '@/services/http';
