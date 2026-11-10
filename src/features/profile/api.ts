import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http } from '@/services/http';

const profileResponseSchema = z
  .object({
    statusCode: z.number().int().positive(),
    message: z.string(),
    data: z
      .object({
        id: z.number().int(),
        name: z.string(),
        family: z.string(),
        mobile: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export type UserProfile = z.infer<typeof profileResponseSchema>['data'];

export async function getCurrentUser(): Promise<UserProfile> {
  const response = await http.request('/users/me', { method: 'GET' });
  const parsed = profileResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}
