import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { strings } from '@/constants/strings';

const DATABASE_NAME = 'heyvanyar-ad-draft';
const FILES_STORE = 'media';
let databasePromise: Promise<IDBDatabase> | null = null;
const objectUrls = new Map<string, string>();

export interface StoredMedia {
  key: string;
  uri: string;
  previewUri: string;
  fileName: string;
  mimeType: string;
}

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(FILES_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(strings.tabs.mediaStorageError));
      request.onblocked = () => reject(new Error(strings.tabs.mediaStorageError));
    });
  }
  return databasePromise;
}

async function storeWebFile(key: string, file: Blob): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILES_STORE, 'readwrite');
    transaction.objectStore(FILES_STORE).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error(strings.tabs.mediaStorageError));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(strings.tabs.mediaStorageError));
  });
}

async function readWebFile(key: string): Promise<Blob> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FILES_STORE, 'readonly');
    const request = transaction.objectStore(FILES_STORE).get(key);
    request.onsuccess = () => {
      if (request.result instanceof Blob) {
        resolve(request.result);
      } else {
        reject(new Error(strings.tabs.mediaMissing));
      }
    };
    request.onerror = () =>
      reject(request.error ?? new Error(strings.tabs.mediaStorageError));
  });
}

async function deleteWebFile(key: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(FILES_STORE, 'readwrite');
    transaction.objectStore(FILES_STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error(strings.tabs.mediaStorageError));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(strings.tabs.mediaStorageError));
  });
  const objectUrl = objectUrls.get(key);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrls.delete(key);
}

function getFileName(asset: ImagePickerAsset, key: string, mimeType: string): string {
  const suggestedName = asset.fileName?.split(/[\\/]/).pop();
  if (suggestedName) return suggestedName.replace(/[^\w.-]/g, '_');
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  return `${key}.${extension}`;
}

export function createMediaKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function savePickedMedia(asset: ImagePickerAsset, key: string): Promise<StoredMedia> {
  const mimeType = asset.mimeType || asset.file?.type || 'application/octet-stream';
  const fileName = getFileName(asset, key, mimeType);

  if (Platform.OS === 'web') {
    let file: Blob;
    if (asset.file) {
      file = asset.file;
    } else {
      const response = await fetch(asset.uri);
      file = await response.blob();
    }
    await storeWebFile(key, file);
    const previewUri = URL.createObjectURL(file);
    objectUrls.set(key, previewUri);
    return { key, uri: '', previewUri, fileName, mimeType };
  }

  const { Directory, File, Paths } = await import('expo-file-system');
  const directory = new Directory(Paths.document, 'ad-draft-media');
  directory.create({ idempotent: true, intermediates: true });

  const file = new File(asset.uri);
  const destination = new File(directory, `${key}-${fileName}`);
  await file.copy(destination);
  return {
    key,
    uri: destination.uri,
    previewUri: destination.uri,
    fileName,
    mimeType,
  };
}

export async function getMediaPreviewUri(key: string, uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  const previous = objectUrls.get(key);
  if (previous) URL.revokeObjectURL(previous);
  const previewUri = URL.createObjectURL(await readWebFile(key));
  objectUrls.set(key, previewUri);
  return previewUri;
}

export async function getStoredMedia(key: string, uri: string): Promise<Blob> {
  if (Platform.OS === 'web') return readWebFile(key);
  const { File } = await import('expo-file-system');
  const file = new File(uri);
  if (!file.exists) throw new Error(strings.tabs.mediaMissing);
  return file;
}

export async function deleteStoredMedia(key: string, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    await deleteWebFile(key);
    return;
  }
  const { File } = await import('expo-file-system');
  const file = new File(uri);
  if (file.exists) file.delete();
}
