import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { z } from 'zod';

import { strings } from '@/constants/strings';
import { authTokensSchema, type AuthTokens } from '@/features/auth/types';

const SESSION_KEY = 'auth-session';

const authSessionSchema = z
  .object({
    tokens: authTokensSchema,
    isNewUser: z.boolean(),
  })
  .strict();

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  isNewUser: boolean;
  postLoginRoute: '/(tabs)/profile' | null;
  setPostLoginRoute: (route: '/(tabs)/profile' | null) => void;
  login: (tokens: AuthTokens, isNewUser?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  completeProfile: () => Promise<void>;
}

export type AuthSession = z.infer<typeof authSessionSchema>;

export async function readAuthSession(): Promise<AuthSession | null> {
  if (Platform.OS === 'web') return null;

  const value = await SecureStore.getItemAsync(SESSION_KEY);
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
  if (Platform.OS === 'web') throw new Error(strings.auth.secureStoreUnavailable);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  isNewUser: false,
  postLoginRoute: null,
  setPostLoginRoute: (postLoginRoute) => set({ postLoginRoute }),
  login: async (tokens, isNewUser = false) => {
    await writeAuthSession({ tokens, isNewUser });
    set({ status: 'authenticated', isNewUser });
  },
  logout: async () => {
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(SESSION_KEY);
    set({ status: 'unauthenticated', isNewUser: false, postLoginRoute: null });
  },
  hydrate: async () => {
    set({ status: 'loading' });
    try {
      const session = await readAuthSession();
      set({
        status: session ? 'authenticated' : 'unauthenticated',
        isNewUser: session?.isNewUser ?? false,
      });
    } catch (error) {
      set({ status: 'unauthenticated', isNewUser: false });
      throw error;
    }
  },
  updateTokens: async (tokens) => {
    const session = await readAuthSession();
    if (!session) throw new Error(strings.auth.sessionExpired);
    await writeAuthSession({ ...session, tokens });
  },
  completeProfile: async () => {
    const session = await readAuthSession();
    if (!session) throw new Error(strings.auth.sessionExpired);
    await writeAuthSession({ ...session, isNewUser: false });
    set({ isNewUser: false });
  },
}));
