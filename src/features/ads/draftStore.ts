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
const storedCategorySchema = z
  .object({
    categoryId: z.number().int().positive(),
    title: z.string().min(1),
  })
  .strict();
const storedDetailsSchema = z
  .object({
    title: z.string(),
    price: z.string(),
    description: z.string(),
  })
  .strict();
const storedDraftSchema = z
  .object({
    photos: z.array(storedPhotoSchema).max(10),
    video: storedVideoSchema.nullable(),
    category: storedCategorySchema.nullable().optional(),
    details: storedDetailsSchema.optional(),
    activeChat: z.boolean().optional(),
    showMobile: z.boolean().optional(),
  })
  .strict();

export type UploadStatus = z.infer<typeof uploadStatusSchema>;
type StoredPhoto = z.infer<typeof storedPhotoSchema>;
type StoredVideo = z.infer<typeof storedVideoSchema>;
export type DraftCategory = z.infer<typeof storedCategorySchema>;
export type DraftDetails = z.infer<typeof storedDetailsSchema>;
export interface DraftAdOptions {
  activeChat: boolean;
  showMobile: boolean;
}

export interface DraftPhoto extends StoredPhoto {
  previewUri: string;
}

export interface DraftVideo extends StoredVideo {
  previewUri: string;
}

type DraftStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AdDraftState {
  status: DraftStatus;
  photos: DraftPhoto[];
  video: DraftVideo | null;
  category: DraftCategory | null;
  details: DraftDetails;
  activeChat: boolean;
  showMobile: boolean;
  hydrate: () => Promise<void>;
  addPhoto: (photo: DraftPhoto) => Promise<void>;
  updatePhoto: (key: string, changes: Partial<StoredPhoto>) => Promise<void>;
  setPrimaryPhoto: (key: string) => Promise<void>;
  removePhoto: (key: string) => Promise<DraftPhoto | null>;
  setVideo: (video: DraftVideo | null) => Promise<void>;
  setCategory: (category: DraftCategory | null) => Promise<void>;
  setDetails: (changes: Partial<DraftDetails>) => Promise<void>;
  setAdOptions: (changes: Partial<DraftAdOptions>) => Promise<void>;
  clearDraft: () => Promise<{ photos: DraftPhoto[]; video: DraftVideo | null }>;
}

let writeQueue: Promise<void> = Promise.resolve();

function persistDraft(
  photos: DraftPhoto[],
  video: DraftVideo | null,
  category: DraftCategory | null,
  details: DraftDetails,
  activeChat: boolean,
  showMobile: boolean,
): Promise<void> {
  const storedVideo = video
    ? (({ previewUri: _previewUri, ...stored }) => stored)(video)
    : null;
  const value = JSON.stringify({
    photos: photos.map(({ previewUri: _previewUri, ...photo }) => photo),
    video: storedVideo,
    category,
    details,
    activeChat,
    showMobile,
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
  category: null,
  details: { title: '', price: '', description: '' },
  activeChat: true,
  showMobile: true,
  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const value = await AsyncStorage.getItem(DRAFT_KEY);
      if (value === null) {
        set({
          photos: [],
          video: null,
          category: null,
          details: { title: '', price: '', description: '' },
          activeChat: true,
          showMobile: true,
          status: 'ready',
        });
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
      const video = parsed.data.video
        ? {
            ...recoverInterruptedUpload(parsed.data.video),
            previewUri: await getMediaPreviewUri(
              parsed.data.video.key,
              parsed.data.video.uri,
            ),
          }
        : null;
      const category = parsed.data.category ?? null;
      const details = parsed.data.details ?? { title: '', price: '', description: '' };
      const activeChat = parsed.data.activeChat ?? true;
      const showMobile = parsed.data.showMobile ?? true;
      set({ photos, video, category, details, activeChat, showMobile, status: 'ready' });
      if (
        photos.some((photo, index) => photo.status !== parsed.data.photos[index]?.status) ||
        video?.status !== parsed.data.video?.status ||
        parsed.data.activeChat === undefined ||
        parsed.data.showMobile === undefined
      ) {
        await persistDraft(photos, video, category, details, activeChat, showMobile);
      }
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },
  addPhoto: async (photo) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    if (photos.length >= 10) throw new Error(strings.tabs.photoLimit);
    const nextPhotos = [...photos, photo];
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video, category, details, activeChat, showMobile);
  },
  updatePhoto: async (key, changes) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    if (!photos.some((photo) => photo.key === key)) return;
    const nextPhotos = photos.map((photo) => (photo.key === key ? { ...photo, ...changes } : photo));
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video, category, details, activeChat, showMobile);
  },
  setPrimaryPhoto: async (key) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    const selected = photos.find((photo) => photo.key === key);
    if (!selected) return;
    const nextPhotos = [selected, ...photos.filter((photo) => photo.key !== key)];
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video, category, details, activeChat, showMobile);
  },
  removePhoto: async (key) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    const removed = photos.find((photo) => photo.key === key) ?? null;
    if (!removed) return null;
    const nextPhotos = photos.filter((photo) => photo.key !== key);
    set({ photos: nextPhotos });
    await persistDraft(nextPhotos, video, category, details, activeChat, showMobile);
    return removed;
  },
  setVideo: async (video) => {
    const { photos, category, details, activeChat, showMobile } = get();
    set({ video });
    await persistDraft(photos, video, category, details, activeChat, showMobile);
  },
  setCategory: async (category) => {
    const { photos, video, details, activeChat, showMobile } = get();
    set({ category });
    await persistDraft(photos, video, category, details, activeChat, showMobile);
  },
  setDetails: async (changes) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    const nextDetails = { ...details, ...changes };
    set({ details: nextDetails });
    await persistDraft(photos, video, category, nextDetails, activeChat, showMobile);
  },
  setAdOptions: async (changes) => {
    const { photos, video, category, details, activeChat, showMobile } = get();
    const nextActiveChat = changes.activeChat ?? activeChat;
    const nextShowMobile = changes.showMobile ?? showMobile;
    if (!nextActiveChat && !nextShowMobile) return;
    set({ activeChat: nextActiveChat, showMobile: nextShowMobile });
    await persistDraft(
      photos,
      video,
      category,
      details,
      nextActiveChat,
      nextShowMobile,
    );
  },
  clearDraft: async () => {
    await writeQueue;
    const { photos, video } = get();
    await AsyncStorage.removeItem(DRAFT_KEY);
    set({
      photos: [],
      video: null,
      category: null,
      details: { title: '', price: '', description: '' },
      activeChat: true,
      showMobile: true,
      status: 'ready',
    });
    return { photos, video };
  },
}));
