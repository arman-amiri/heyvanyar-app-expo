import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { useCallback } from 'react';

export function useRequireAuth() {
    const status = useAuthStore((state) => state.status);

    return useCallback(
        (action: () => void) => {
            if (status !== 'authenticated') {
                router.push('/(auth)/login');
                return;
            }
            action();
        },
        [status],
    );
}