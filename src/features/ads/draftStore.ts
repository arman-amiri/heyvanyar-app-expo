import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { z } from 'zod';

import { strings } from '@/constants/strings';

import { getMediaPreviewUri } from './mediaStorage';

const DRAFT_KEY = 'ad-creation-draft-v1';
const uploadStatusSchema = z.enum(['uploading', 'uploaded', 'failed']);
const storedPhotoSchema = z
  .object({
    key: z.string().min(1),
    uri: z.string(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    status: uploadStatusSchema,
    id: z.number().int().positive().optional(),
  })
  .strict();
const storedVideoSchema = z
  .object({
    key: z.string().min(1),
    uri: z.string(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    status: uploadStatusSchema,
    storedName: z.string().min(1).optional(),
  })
  .strict();
const storedDraftSchema = z
  .object({
    photos: z.array(storedPhotoSchema).max(10),
    video: storedVideoSchema.nullable(),
  })
  .strict();

export type UploadStatus = z.infer<typeof uploadStatusSchema>;
type StoredPhoto = z.infer<typeof storedPhotoSchema>;
type StoredVideo = z.infer<typeof storedVideoSchema>;

export interface DraftPhoto extends StoredPhoto {
  previewUri: string;
}

export type DraftVideo = StoredVideo;

type DraftStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AdDraftState {
  status: DraftStatus;
  photos: DraftPhoto[];
  video: DraftVideo | null;
  hydrate: () => Promise<void>;
  addPhoto: (photo: DraftPhoto) => Promise<void>;
  updatePhoto: (key: string, changes: Partial<StoredPhoto>) => Promise<void>;
  setPrimaryPhoto: (key: string) => Promise<void>;
  removePhoto: (key: string) => Promise<DraftPhoto | null>;
  setVideo: (video: DraftVideo | null) => Promise<void>;
  clearDraft: () => Promise<{ photos: DraftPhoto[]; video: DraftVideo | null }>;
}

let writeQueue: Promise<void> = Promise.resolve();

function persistDraft(photos: DraftPhoto[], video: DraftVideo | null): Promise<void> {
  const value = JSON.stringify({
    photos: photos.map(({ previewUri: _previewUri, ...photo }) => photo),
    video,
  });
  const nextWrite = writeQueue.then(() => AsyncStorage.setItem(DRAFT_KEY, value));
  writeQueue = nextWrite.catch(() => undefined);
  return nextWrite;
}

function recoverInterruptedUpload<T extends { status: UploadStatus }>(media: T): T {
  return media.status === 'uploading' ? { ...media, status: 'failed' } : media;
}

export const useAdDraftStore = create<AdDraftState>((set, get) => ({
  status: 'idle',
  photos: [],
  video: null,
  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const value = await AsyncStorage.getItem(DRAFT_KEY);
      if (value === null) {
        set({ photos: [], video: null, status: 'ready' });
        return;
      }

      let rawDraft: unknown;
      try {
        rawDraft = JSON.parse(value);
      } catch {
        throw new Error(strings.tabs.draftRestoreError);
      }
      const parsed = storedDraftSchema.safeParse(rawDraft);
      if (!parsed.success) throw new Error(strings.tabs.draftRestoreError);

      const photos = await Promise.all(
        parsed.data.photos.map(async (storedPhoto) => ({
          ...recoverInterruptedUpload(storedPhoto),
          previewUri: await getMediaPreviewUri(storedPhoto.key, storedPhoto.uri),
        })),
      );
      const video = parsed.data.video ? recoverInterruptedUpload(parsed.data.video) : null;
      set({ photos, video, status: 'ready' });
      if (
        photos.some((photo, index) => photo.status !== parsed.data.photos[index]?.status) ||
        video?.status !== parsed.data.video?.status
      ) {
        await persistDraft(photos, video);
      }
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },
  addPhoto: async (photo) => {
    const { photos, video } = get();
    if (photos.length >= 10) throw new Error(strings.tabs.photoLimit);
    const nextPhotos = [...photos, photo];
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video);
  },
  updatePhoto: async (key, changes) => {
    const { photos, video } = get();
    if (!photos.some((photo) => photo.key === key)) return;
    const nextPhotos = photos.map((photo) => (photo.key === key ? { ...photo, ...changes } : photo));
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video);
  },
  setPrimaryPhoto: async (key) => {
    const { photos, video } = get();
    const selected = photos.find((photo) => photo.key === key);
    if (!selected) return;
    const nextPhotos = [selected, ...photos.filter((photo) => photo.key !== key)];
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video);
  },
  removePhoto: async (key) => {
    const { photos, video } = get();
    const removed = photos.find((photo) => photo.key === key) ?? null;
    if (!removed) return null;
    const nextPhotos = photos.filter((photo) => photo.key !== key);
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video);
    return removed;
  },
  setVideo: async (video) => {
    const { photos } = get();
    set({ video });
    await persistDraft(photos, video);
  },
  clearDraft: async () => {
    await writeQueue;
    const { photos, video } = get();
    await AsyncStorage.removeItem(DRAFT_KEY);
    set({ photos: [], video: null, status: 'ready' });
    return { photos, video };
  },
}));
