import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http } from '@/services/http';

// const adSchema = z
//   .object({
//     id: z.number().int(),
//     shortLink: z.string().min(1),
//     title: z.string(),
//     price: z.string().regex(/^\d+(?:\.\d+)?$/),
//     mainImage: z
//       .object({ url: z.string().url() })
//       .passthrough()
//       .nullable()
//       .optional(),
//     category: z
//       .object({ title: z.string() })
//       .passthrough()
//       .nullable()
//       .optional(),
//   })
//   .passthrough();

const adSchema = z
  .object({
    id: z.number().int(),
    shortLink: z.string().min(1),
    title: z.string(),
    price: z.string().regex(/^\d+(?:\.\d+)?$/),
    mainImage: z
      .object({ url: z.string().url() })
      .passthrough()
      .nullable()
      .optional(),
    category: z
      .object({
        title: z.string(),
        parent: z
          .object({ id: z.number().int(), title: z.string() })
          .passthrough()
          .nullable()
          .optional(),
      })
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

const adCategorySuggestionSchema = z
  .object({
    categoryId: z.number().int(),
    categoryTitle: z.string(),
    categorySlug: z.string(),
    parent: z
      .object({
        id: z.number().int(),
        title: z.string(),
        slug: z.string(),
      })
      .passthrough()
      .nullable()
      .optional(),
    count: z.number().int().nonnegative(),
  })
  .passthrough();

const adCategorySuggestionsResponseSchema = z
  .object({
    statusCode: z.number(),
    message: z.string(),
    data: z
      .object({
        query: z.string(),
        total: z.number().int().nonnegative(),
        categoriesCount: z.number().int().nonnegative(),
        categories: z.array(adCategorySuggestionSchema),
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
    data: z
      .object({
        data: z.array(myAdSchema),
      })
      .passthrough(),
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
    locationId: z.number().int().positive().nullable().optional(),
    category: z
      .object({
        id: z.number().int(),
        title: z.string(),
        parent: z
          .object({ id: z.number().int(), title: z.string() })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    activeChat: z.boolean().optional(),
    showMobile: z.boolean().optional(),
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
export type AdCategorySuggestion = z.infer<typeof adCategorySuggestionSchema>;
export type MyAd = z.infer<typeof myAdSchema>;
export type AdMedia = z.infer<typeof adMediaSchema>;
export type AdDetails = z.infer<typeof adDetailsSchema>;

export interface SearchAdsParams {
  page: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  locationIds: number[];
}

export async function searchAds({
  page,
  limit = 20,
  search,
  categoryId,
  locationIds,
}: SearchAdsParams): Promise<AdsPage> {
  const response = await http.request('/ads/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page,
      limit,
      search: search?.trim() || undefined,
      categoryId,
      locationIds,
    }),
    auth: false,
  });
  const parsed = adsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}

export async function searchAdCategories(query: string): Promise<AdCategorySuggestion[]> {
  const response = await http.request(
    `/ads/search/by-category?q=${encodeURIComponent(query)}`,
    { method: 'GET', auth: false },
  );
  const parsed = adCategorySuggestionsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data.categories;
}

export async function getMyAds(page: number): Promise<MyAd[]> {
  const response = await http.request(`/ads/my/list?page=${page}`, { method: 'GET' });
  const parsed = myAdsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data.data;
}

export async function getAdDetails(shortLink: string, auth = true): Promise<AdDetails> {
  const response = await http.request(`/ads/${encodeURIComponent(shortLink)}/preview`, {
    method: 'GET',
    auth,
  });
  const parsed = adDetailsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}

export async function deleteMyAd(shortLink: string): Promise<void> {
  await http.request(`/ads/${encodeURIComponent(shortLink)}`, { method: 'DELETE' });
}
