import { z } from 'zod';

import { strings } from '@/constants/strings';
import { http } from '@/services/http';

const locationSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1),
    type: z.enum(['ostan', 'shahrestan', 'bakhsh', 'dehestan', 'shahr_roosta']),
    parent: z.number().int().positive().nullable(),
  })
  .passthrough();

const locationsResponseSchema = z.array(locationSchema);

export type Location = z.infer<typeof locationSchema>;
export interface LocationSelectionAction {
  key: string;
  title: string;
  whole: boolean;
  pathIds: number[];
  type: Location['type'] | 'iran';
  locationId: number | null;
  selected: boolean;
}

export async function getLocations(parentId?: number): Promise<Location[]> {
  const path = parentId === undefined ? '/location' : `/location?parentId=${parentId}`;
  const response = await http.request(path, { method: 'GET', auth: false });
  const parsed = locationsResponseSchema.safeParse(response);
  if (!parsed.success) throw new Error(strings.auth.invalidResponse);
  return parsed.data;
}
