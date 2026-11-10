import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http } from '@/services/http';

const adSchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    price: z.string().regex(/^\d+(?:\.\d+)?$/),
    mainImage: z
      .object({ url: z.string().url() })
      .passthrough()
      .nullable()
      .optional(),
    category: z
      .object({ title: z.string() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const adsResponseSchema = z
  .object({
    statusCode: z.number(),
    message: z.string(),
    data: z
      .object({
        items: z.array(adSchema),
        pagination: z
          .object({
            page: z.number().int().positive(),
            hasNextPage: z.boolean(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export type Ad = z.infer<typeof adSchema>;
export type AdsPage = z.infer<typeof adsResponseSchema>['data'];

export async function getAds(page: number): Promise<AdsPage> {
  const response = await http.request(`/ads?page=${page}`, {
    method: 'GET',
    auth: false,
  });
  const parsed = adsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}
