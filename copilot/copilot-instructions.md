# Project Instructions: React Native + Expo

## Stack

- React Native with Expo (managed workflow), latest stable SDK
- TypeScript in strict mode (no `any`; use `unknown` + type guards)
- Expo Router (file-based routing) in the `app/` directory
- State: React hooks + Zustand for global state; TanStack Query for server state
- Styling: `StyleSheet.create` (or NativeWind if already installed in the project)
- Package manager: follow the lockfile present (npm / pnpm / yarn); never mix them

## General Rules

- Use functional components and hooks only. No class components.
- Install Expo-compatible packages with `npx expo install <pkg>`, NOT `npm install`, so versions match the SDK.
- Prefer Expo SDK modules (`expo-image`, `expo-secure-store`, `expo-file-system`, ...) over community libraries when equivalent.
- Do not suggest `expo eject` or bare-workflow changes. Use config plugins / `app.config.ts` and prebuild (`npx expo prebuild`) when native config is needed.
- Never hardcode secrets. Use `EXPO_PUBLIC_*` env vars only for non-secret values; store tokens with `expo-secure-store`.
- Code must work on both iOS and Android. Use `Platform.select` / `.ios.tsx` / `.android.tsx` only when really needed.
- Always handle loading, error, and empty states in screens.
- Respect safe areas (`react-native-safe-area-context`) and keyboard (`KeyboardAvoidingView` / `keyboard-controller`).

## Folder Structure

```
app/                # Expo Router routes only (thin screens)
src/
  components/       # Reusable UI components
  features/<name>/  # Feature modules (components, hooks, api, types)
  hooks/
  services/         # API clients, storage, analytics
  store/            # Zustand stores
  constants/        # theme, colors, config
  utils/
assets/
```

## Naming & Style

- Components: PascalCase files (`UserCard.tsx`); hooks: `useXxx.ts`; utils: camelCase.
- Named exports for components (default export only for route files in `app/`).
- Props typed with `interface XxxProps`. Do not use `React.FC`.
- Keep components under ~150 lines; extract hooks and subcomponents.
- Avoid inline styles and anonymous functions inside heavy lists.

## Performance

- Use `FlatList` / `FlashList` for lists, with `keyExtractor`, memoized `renderItem`, and stable props.
- Use `expo-image` instead of `Image`.
- Use `useCallback` / `useMemo` / `React.memo` only where profiling or list rendering justifies it.
- Animations: `react-native-reanimated` (run on UI thread); avoid JS-thread animations.

## Testing & Quality

- Jest + `@testing-library/react-native` (`jest-expo` preset).
- Run `npx expo-doctor`, `npx tsc --noEmit`, and `npx expo lint` before finishing a task.

## Answer Format for Copilot

- Show complete, runnable code with imports.
- Mention any package that must be installed and the exact `npx expo install` command.
- If native code / config plugin is required, say so explicitly (needs a dev build, not Expo Go).
