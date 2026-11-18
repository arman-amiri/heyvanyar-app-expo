import { http } from '@/services/http';

export interface CreateAdRequest {
  title: string;
  price: string;
  description: string;
  locationId: number;
  categoryId: number;
  images: number[];
  mainImageId?: number;
  videoStoredName?: string;
  activeChat: boolean;
  showMobile: boolean;
}

export async function createAd(ad: CreateAdRequest): Promise<void> {
  await http.request('/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ad),
  });
}

export async function updateAd(shortLink: string, ad: CreateAdRequest): Promise<void> {
  await http.request(`/ads/update/${encodeURIComponent(shortLink)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ad),
  });
}
