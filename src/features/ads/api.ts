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

const adMediaSchema = z
  .object({
    id: z.number().int(),
    storedName: z.string().optional(),
    url: z.string().url().optional(),
  })
  .passthrough();

const myAdSchema = z
  .object({
    id: z.number().int(),
    shortLink: z.string().min(1),
    title: z.string().min(1),
    price: z.string().regex(/^\d+(?:\.\d+)?$/),
    mainImage: adMediaSchema.nullable().optional(),
    files: z.array(adMediaSchema).optional(),
    video: adMediaSchema.nullable().optional(),
  })
  .passthrough();

const myAdsResponseSchema = z
  .object({
    statusCode: z.number(),
    message: z.string(),
    data: z.array(myAdSchema),
  })
  .passthrough();

const adDetailsSchema = z
  .object({
    id: z.number().int(),
    shortLink: z.string().min(1),
    title: z.string().min(1),
    price: z.string().regex(/^\d+(?:\.\d+)?$/),
    description: z.string(),
    publishAt: z.string().min(1),
    files: z.array(adMediaSchema).optional(),
    mainImage: adMediaSchema.nullable().optional(),
    video: adMediaSchema.nullable().optional(),
  })
  .passthrough();

const adDetailsResponseSchema = z
  .object({
    statusCode: z.number(),
    message: z.string(),
    data: adDetailsSchema,
  })
  .passthrough();

export type Ad = z.infer<typeof adSchema>;
export type AdsPage = z.infer<typeof adsResponseSchema>['data'];
export type MyAd = z.infer<typeof myAdSchema>;
export type AdMedia = z.infer<typeof adMediaSchema>;
export type AdDetails = z.infer<typeof adDetailsSchema>;

export async function getAds(page: number): Promise<AdsPage> {
  const response = await http.request(`/ads?page=${page}`, {
    method: 'GET',
    auth: false,
  });
  const parsed = adsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}

export async function getMyAds(page: number): Promise<MyAd[]> {
  const response = await http.request(`/ads/my?page=${page}`, { method: 'GET' });
  const parsed = myAdsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}

export async function getAdDetails(shortLink: string): Promise<AdDetails> {
  const response = await http.request(`/ads/${encodeURIComponent(shortLink)}`, {
    method: 'GET',
  });
  const parsed = adDetailsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}
