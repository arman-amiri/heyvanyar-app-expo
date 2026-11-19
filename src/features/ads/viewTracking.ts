import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { postAdView } from './api';

const GUEST_ID_KEY = 'heyvanyar.guest-id.v1';
const VIEWED_AD_PREFIX = 'heyvanyar.viewed-ad.v1.';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pendingViews = new Map<string, Promise<void>>();

let guestIdPromise: Promise<string> | null = null;

function createGuestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getOrCreateGuestId(): Promise<string> {
  if (!guestIdPromise) {
    guestIdPromise = (async () => {
      const storedGuestId = await AsyncStorage.getItem(GUEST_ID_KEY);
      if (storedGuestId && uuidPattern.test(storedGuestId)) return storedGuestId;

      const guestId = createGuestId();
      await AsyncStorage.setItem(GUEST_ID_KEY, guestId);
      return guestId;
    })().catch((error: unknown) => {
      guestIdPromise = null;
      throw error;
    });
  }
  return guestIdPromise;
}

export async function registerAdViewOnce(adId: number): Promise<void> {
  const guestId = await getOrCreateGuestId();
  const storageKey = `${VIEWED_AD_PREFIX}${guestId}:${adId}`;
  const pendingRequest = pendingViews.get(storageKey);
  if (pendingRequest) return pendingRequest;

  const request = (async () => {
    if ((await AsyncStorage.getItem(storageKey)) === '1') return;

    await postAdView(adId, {
      guestId,
      osName: Device.osName ?? Platform.OS,
      osVersion: Device.osVersion ?? 'unknown',
      deviceModel: Device.modelName ?? 'unknown',
      isEmulator: !Device.isDevice,
      appVersion: Constants.expoConfig?.version ?? 'unknown',
    });
    await AsyncStorage.setItem(storageKey, '1');
  })();
  pendingViews.set(storageKey, request);

  try {
    await request;
  } finally {
    pendingViews.delete(storageKey);
  }
}
