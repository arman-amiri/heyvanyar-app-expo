import { useMutation } from '@tanstack/react-query';

import { sendOtp } from './api';

export function useSendOtp() {
  return useMutation({
    mutationFn: sendOtp,
    retry: false,
  });
}
