import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http, HttpError } from '@/services/http';

import { authTokensSchema, type AuthTokens } from './types';

const phoneSchema = z.string().regex(/^09\d{9}$/);

const sendOtpResponseSchema = z
  .object({
    success: z.literal(true),
    expiresIn: z.number().int().positive(),
  })
  .strict();

const verifyOtpResponseSchema = authTokensSchema
  .extend({
    isNewUser: z.boolean(),
  })
  .strict();

export interface SendOtpResponse {
  success: true;
  expiresIn: number;
}

export interface VerifyOtpResponse extends AuthTokens {
  isNewUser: boolean;
}

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

export function normalizePhone(value: string): string {
  return normalizeDigits(value);
}

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
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
  const parsed = sendOtpResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data;
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

  const response = await http.request('/auth/verify-otp', {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone, code: normalizedCode }),
  });
  const parsed = verifyOtpResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data;
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
export { authTokensSchema };
