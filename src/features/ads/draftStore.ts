import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { z } from 'zod';

import { strings } from '@/constants/strings';

import { getMediaPreviewUri } from './mediaStorage';
import { getAdDetails, type AdDetails, type AdMedia } from './api';

const DRAFT_KEY = 'ad-creation-draft-v1';
const EDIT_DRAFT_PREFIX = 'ad-edit-draft-v1-';
const uploadStatusSchema = z.enum(['uploading', 'uploaded', 'failed']);
const storedPhotoSchema = z
  .object({
    key: z.string().min(1),
    uri: z.string(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    status: uploadStatusSchema,
    id: z.number().int().positive().optional(),
    remote: z.boolean().optional(),
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
    remote: z.boolean().optional(),
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
  editShortLink: string | null;
  photos: DraftPhoto[];
  video: DraftVideo | null;
  category: DraftCategory | null;
  details: DraftDetails;
  activeChat: boolean;
  showMobile: boolean;
  hydrate: (shortLink?: string) => Promise<void>;
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
  key: string,
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
  const nextWrite = writeQueue.then(() => AsyncStorage.setItem(key, value));
  writeQueue = nextWrite.catch(() => undefined);
  return nextWrite;
}

function getDraftKey(shortLink: string | null): string {
  return shortLink ? `${EDIT_DRAFT_PREFIX}${encodeURIComponent(shortLink)}` : DRAFT_KEY;
}

function recoverInterruptedUpload<T extends { status: UploadStatus }>(media: T): T {
  return media.status === 'uploading' ? { ...media, status: 'failed' } : media;
}

function isVideoFile(file: AdMedia): boolean {
  return /\.(mp4|mov|m4v|webm)(?:[?#]|$)/i.test(file.storedName ?? file.url ?? '');
}

function mediaFileName(file: AdMedia): string {
  return file.storedName ?? `ad-media-${file.id}`;
}

function mediaMimeType(file: AdMedia): string {
  const extension = file.storedName?.split('.').pop()?.toLowerCase();
  if (extension === 'mp4' || extension === 'mov' || extension === 'm4v' || extension === 'webm') {
    return `video/${extension}`;
  }
  return 'image/jpeg';
}

function mapEditMedia(ad: AdDetails) {
  const images = new Map<number, AdMedia>();
  const imageFiles = [
    ...(ad.mainImage ? [ad.mainImage] : []),
    ...(ad.files ?? []),
  ];
  for (const file of imageFiles) {
    if (isVideoFile(file)) continue;
    const previous = images.get(file.id);
    images.set(file.id, {
      ...previous,
      ...file,
      storedName: file.storedName ?? previous?.storedName,
      url: file.url ?? previous?.url,
    });
  }

  const photos: DraftPhoto[] = [...images.values()].map((file) => ({
    key: `remote-${file.id}`,
    uri: file.url ?? '',
    previewUri: file.url ?? '',
    fileName: mediaFileName(file),
    mimeType: mediaMimeType(file),
    status: 'uploaded',
    id: file.id,
    remote: true,
  }));
  const videoFile =
    ad.video ?? (ad.files ?? []).find((file) => isVideoFile(file));
  const video: DraftVideo | null = videoFile
    ? {
        key: `remote-${videoFile.id}`,
        uri: videoFile.url ?? '',
        previewUri: videoFile.url ?? '',
        fileName: mediaFileName(videoFile),
        mimeType: mediaMimeType(videoFile),
        status: 'uploaded',
        storedName: videoFile.storedName,
        remote: true,
      }
    : null;

  return {
    photos,
    video,
    category: ad.category
      ? { categoryId: ad.category.id, title: ad.category.title }
      : null,
    details: { title: ad.title, price: String(Number(ad.price)), description: ad.description },
    activeChat: ad.activeChat ?? true,
    showMobile: ad.showMobile ?? true,
  };
}

export const useAdDraftStore = create<AdDraftState>((set, get) => ({
  status: 'idle',
  editShortLink: null,
  photos: [],
  video: null,
  category: null,
  details: { title: '', price: '', description: '' },
  activeChat: true,
  showMobile: true,
  hydrate: async (shortLink) => {
    set({ status: 'loading' });
    try {
      const key = getDraftKey(shortLink ?? null);
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        if (shortLink) {
          const editState = mapEditMedia(await getAdDetails(shortLink));
          set({ ...editState, editShortLink: shortLink, status: 'ready' });
          await persistDraft(
            key,
            editState.photos,
            editState.video,
            editState.category,
            editState.details,
            editState.activeChat,
            editState.showMobile,
          );
          return;
        }
        set({
          editShortLink: null,
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
          previewUri: storedPhoto.remote
            ? storedPhoto.uri
            : await getMediaPreviewUri(storedPhoto.key, storedPhoto.uri),
        })),
      );
      const video = parsed.data.video
        ? {
            ...recoverInterruptedUpload(parsed.data.video),
            previewUri: parsed.data.video.remote
              ? parsed.data.video.uri
              : await getMediaPreviewUri(parsed.data.video.key, parsed.data.video.uri),
          }
        : null;
      const category = parsed.data.category ?? null;
      const details = parsed.data.details ?? { title: '', price: '', description: '' };
      const activeChat = parsed.data.activeChat ?? true;
      const showMobile = parsed.data.showMobile ?? true;
      set({
        photos,
        video,
        category,
        details,
        activeChat,
        showMobile,
        editShortLink: shortLink ?? null,
        status: 'ready',
      });
      if (
        photos.some((photo, index) => photo.status !== parsed.data.photos[index]?.status) ||
        video?.status !== parsed.data.video?.status ||
        parsed.data.activeChat === undefined ||
        parsed.data.showMobile === undefined
      ) {
        await persistDraft(key, photos, video, category, details, activeChat, showMobile);
      }
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },
  addPhoto: async (photo) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    if (photos.length >= 10) throw new Error(strings.tabs.photoLimit);
    const nextPhotos = [...photos, photo];
    set({ photos: nextPhotos });
    await persistDraft(getDraftKey(editShortLink), nextPhotos, video, category, details, activeChat, showMobile);
  },
  updatePhoto: async (key, changes) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    if (!photos.some((photo) => photo.key === key)) return;
    const nextPhotos = photos.map((photo) => (photo.key === key ? { ...photo, ...changes } : photo));
    set({ photos: nextPhotos });
    await persistDraft(getDraftKey(editShortLink), nextPhotos, video, category, details, activeChat, showMobile);
  },
  setPrimaryPhoto: async (key) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    const selected = photos.find((photo) => photo.key === key);
    if (!selected) return;
    const nextPhotos = [selected, ...photos.filter((photo) => photo.key !== key)];
    set({ photos: nextPhotos });
    await persistDraft(getDraftKey(editShortLink), nextPhotos, video, category, details, activeChat, showMobile);
  },
  removePhoto: async (key) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    const removed = photos.find((photo) => photo.key === key) ?? null;
    if (!removed) return null;
    const nextPhotos = photos.filter((photo) => photo.key !== key);
    set({ photos: nextPhotos });
    await persistDraft(getDraftKey(editShortLink), nextPhotos, video, category, details, activeChat, showMobile);
    return removed;
  },
  setVideo: async (video) => {
    const { editShortLink, photos, category, details, activeChat, showMobile } = get();
    set({ video });
    await persistDraft(getDraftKey(editShortLink), photos, video, category, details, activeChat, showMobile);
  },
  setCategory: async (category) => {
    const { editShortLink, photos, video, details, activeChat, showMobile } = get();
    set({ category });
    await persistDraft(getDraftKey(editShortLink), photos, video, category, details, activeChat, showMobile);
  },
  setDetails: async (changes) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    const nextDetails = { ...details, ...changes };
    set({ details: nextDetails });
    await persistDraft(getDraftKey(editShortLink), photos, video, category, nextDetails, activeChat, showMobile);
  },
  setAdOptions: async (changes) => {
    const { editShortLink, photos, video, category, details, activeChat, showMobile } = get();
    const nextActiveChat = changes.activeChat ?? activeChat;
    const nextShowMobile = changes.showMobile ?? showMobile;
    if (!nextActiveChat && !nextShowMobile) return;
    set({ activeChat: nextActiveChat, showMobile: nextShowMobile });
    await persistDraft(
      getDraftKey(editShortLink),
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
    const { editShortLink, photos, video } = get();
    await AsyncStorage.removeItem(getDraftKey(editShortLink));
    set({
      editShortLink: null,
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
