import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);
  const isNewUser = useAuthStore((state) => state.isNewUser);

  if (status === 'loading') return null;
  if (status === 'authenticated') {
    return <Redirect href={isNewUser ? '/(auth)/complete-profile' : '/(tabs)'} />;
  }
  return <Redirect href="/(auth)/login" />;
}
