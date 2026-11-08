---
applyTo: "app/**/*.{ts,tsx}"
---
# Expo Router Rules

- Files in `app/` are routes: keep them thin; put logic in `src/features/*`.
- Layouts: `_layout.tsx`. Groups: `(tabs)`, `(auth)`. Dynamic routes: `[id].tsx`.
- Navigate with `router.push`, `router.replace`, `<Link href=...>`; use typed routes (`experiments.typedRoutes` in app config).
- Read params with `useLocalSearchParams<{ id: string }>()`.
- Protect routes via a layout-level redirect (`<Redirect href="/login" />`) based on auth state.
- Set screen options with `<Stack.Screen options={{ title: '...' }} />`.
- Provide `+not-found.tsx` and an error boundary (`export { ErrorBoundary } from 'expo-router'`).
- Route files use `export default`.
