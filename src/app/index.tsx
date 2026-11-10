import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

export default function IndexRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return null;
  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/profile" />;
  }
  return <Redirect href="/(tabs)" />;
}
