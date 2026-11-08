// src/constants/env.ts
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing env variable: ${name}`);
  return value;
}

export const env = {
  apiUrl: required(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL'),
};

// after change env run this => npx expo start -c