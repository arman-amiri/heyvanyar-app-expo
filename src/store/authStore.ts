import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { z } from 'zod';

import { strings } from '@/constants/strings';
import { accessTokenSchema } from '@/features/auth/types';

const SESSION_KEY = 'auth-session';

const authSessionSchema = z.union([
  z.object({ accessToken: accessTokenSchema }).strict(),
  z
    .object({
      tokens: z.object({ accessToken: accessTokenSchema }).passthrough(),
      isNewUser: z.boolean(),
    })
    .passthrough()
    .transform(({ tokens }) => ({ accessToken: tokens.accessToken })),
]);

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type AuthSession = z.infer<typeof authSessionSchema>;
export type PostLoginRoute = '/(tabs)/ads' | '/ad-stage-three';

interface AuthState {
  status: AuthStatus;
  postLoginRoute: PostLoginRoute | null;
  login: (accessToken: string, postLoginRoute?: PostLoginRoute) => Promise<void>;
  clearPostLoginRoute: () => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const value =
    Platform.OS === 'web'
      ? typeof window === 'undefined'
        ? null
        : window.sessionStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);
  if (value === null) return null;

  let sessionValue: unknown;
  try {
    sessionValue = JSON.parse(value);
  } catch {
    throw new Error(strings.auth.sessionRestoreError);
  }

  const parsed = authSessionSchema.safeParse(sessionValue);
  if (!parsed.success) throw new Error(strings.auth.sessionRestoreError);
  return parsed.data;
}

async function writeAuthSession(session: AuthSession): Promise<void> {
  const value = JSON.stringify(session);
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error(strings.auth.browserStorageUnavailable);
    window.sessionStorage.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function deleteAuthSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  postLoginRoute: null,
  login: async (accessToken, postLoginRoute = undefined) => {
    await writeAuthSession({ accessToken });
    set({ status: 'authenticated', postLoginRoute: postLoginRoute ?? null });
  },
  logout: async () => {
    await deleteAuthSession();
    set({ status: 'unauthenticated', postLoginRoute: null });
  },
  clearPostLoginRoute: () => set({ postLoginRoute: null }),
  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const session = await readAuthSession();
      set({ status: session ? 'authenticated' : 'unauthenticated', postLoginRoute: null });
    } catch (error) {
      set({ status: 'unauthenticated', postLoginRoute: null });
      throw error;
    }
  },
}));
