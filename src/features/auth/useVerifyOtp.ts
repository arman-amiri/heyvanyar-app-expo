import { useMutation } from '@tanstack/react-query';

import { verifyOtp } from './api';

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) => verifyOtp(phone, code),
    retry: false,
  });
}
