---
name: expo-project-setup
description: Create and configure a new React Native project with Expo, TypeScript, Expo Router, linting, and a clean folder structure. Use when the user asks to start, scaffold, or initialize an Expo / React Native app.
---

# Expo Project Setup

## Steps

1. Create the project:
   ```bash
   npx create-expo-app@latest my-app
   cd my-app
   ```
2. Verify TypeScript + Expo Router are present (default template). Run:
   ```bash
   npx expo-doctor
   npx expo start
   ```
3. Install common dependencies with `npx expo install` (not npm):
   ```bash
   npx expo install expo-secure-store expo-image expo-constants expo-linking
   npx expo install react-native-reanimated react-native-gesture-handler react-native-safe-area-context react-native-screens
   npm i zustand @tanstack/react-query zod
   ```
4. Create the folder structure: `src/components`, `src/features`, `src/hooks`, `src/services`, `src/store`, `src/constants`, `src/utils`.
5. Add path alias in `tsconfig.json`:
   ```json
   { "compilerOptions": { "strict": true, "paths": { "@/*": ["./src/*"] } } }
   ```
6. Configure `app.config.ts` (name, slug, scheme, bundle identifiers, `newArchEnabled`, plugins).
7. Add ESLint (`npx expo lint`) and Prettier; add `typecheck` script: `tsc --noEmit`.
8. Add `.env` with `EXPO_PUBLIC_API_URL` and a `.env.example`; add `.env` to `.gitignore`.

## Checklist

- [ ] `npx expo-doctor` passes
- [ ] App runs on iOS simulator and Android emulator
- [ ] Strict TypeScript and lint pass
