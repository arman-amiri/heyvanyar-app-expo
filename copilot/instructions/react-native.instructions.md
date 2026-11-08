---
applyTo: "**/*.{ts,tsx}"
---
# React Native / TypeScript Rules

- Import only from `react-native` the components you use; never use web elements (`div`, `span`, `img`).
- All text must be inside `<Text>`.
- Use `Pressable` instead of `TouchableOpacity` for new code; add `accessibilityRole` and `accessibilityLabel`.
- Use `StyleSheet.create` at the bottom of the file; no magic numbers — use theme constants.
- Use `useWindowDimensions` instead of `Dimensions.get` in components.
- Type navigation params and API responses. Validate external data (e.g. with Zod).
- Async code: always `try/catch` or handle query errors; never leave unhandled promise rejections.
- Clean up effects (listeners, timers, subscriptions) in the `useEffect` return.
- Avoid `console.log` in committed code.
- Support RTL when relevant: use `start`/`end` (`marginStart`, `paddingEnd`) instead of `left`/`right`.
