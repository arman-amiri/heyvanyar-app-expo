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

# Project Design & Coding Rules

## App Overview
- This is a pet classifieds (pet ads) app
- Tone/feel: warm, friendly, trustworthy
- The app UI is written in **Persian (Farsi)** and is fully **RTL** (right-to-left)

## Colors
Use only the colors defined in the theme. Never create new hex codes and never hardcode colors in components.
- primary: #F59E0B
- secondary: #0F766E
- background: #FFF8F0
- surface: #FFFFFF
- text: #1F2937
- textMuted: #6B7280
- error: #DC2626
- success: #16A34A

## Typography
- Font: **IRANSans** (apply it globally through the theme, not per widget/component)
- Support Persian digits and proper RTL text rendering

## Components & Layout
- Buttons: 12px border radius, primary color
- Ad card: white (surface) background, soft shadow, image on top, title below the image
- Use an 8px spacing system everywhere (8, 16, 24, ...)
- Before creating a new component, check the existing components in `/components` and reuse them whenever possible

## Language & Direction (RTL)
- All user-facing text (buttons, titles, error messages, placeholders) must be in Persian
- Variable names, function names, and code comments must be in English
- Never use `left` / `right`. Use `start` / `end` instead
  - Example: `paddingStart` instead of `paddingLeft`, `marginEnd` instead of `marginRight`
- Set `textAlign: start`, not `left`
- Directional icons (back arrow, next arrow, chevrons) must be mirrored in RTL
- Display numbers in Persian digits (۱۲۳ instead of 123) and dates in the Jalali (Shamsi) calendar
- Do not hardcode UI strings in components; read them from the localization (l10n / i18n) files
