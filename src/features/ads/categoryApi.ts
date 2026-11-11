import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http } from '@/services/http';

const categorySchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1),
  })
  .passthrough();

const categoriesResponseSchema = z
  .object({
    data: z.array(categorySchema),
  })
  .passthrough();

export type Category = z.infer<typeof categorySchema>;

async function getCategories(path: string): Promise<Category[]> {
  const response = await http.request(path, { method: 'GET' });
  const parsed = categoriesResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data.data;
}

export function getParentCategories(): Promise<Category[]> {
  return getCategories('/category/parents');
}

export function getCategoryChildren(parentId: number): Promise<Category[]> {
  return getCategories(`/category/${parentId}/children`);
}
