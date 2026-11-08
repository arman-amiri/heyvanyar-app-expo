import { z } from 'zod';

export const authTokensSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
  })
  .strict();

export type AuthTokens = z.infer<typeof authTokensSchema>;
