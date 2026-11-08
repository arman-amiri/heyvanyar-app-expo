---
name: rn-component-creation
description: Create typed, accessible, performant React Native components and screens following project conventions. Use when asked to build a component, screen, list, form, or hook.
---

# React Native Component Creation

## Component Template

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

interface UserCardProps {
  name: string;
  onPress?: () => void;
}

export function UserCard({ name, onPress }: UserCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View>
        <Text style={styles.title}>{name}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12 },
  pressed: { opacity: 0.7 },
  title: { fontSize: 16, fontWeight: "600" },
});
```

## Rules

1. Typed props interface, named export, no `React.FC`.
2. Pull theme values (colors, spacing) from `src/constants/theme.ts`.
3. Add accessibility props to every interactive element.
4. Screens must render loading, error, and empty states.
5. Lists: use `FlatList`/`FlashList` with `keyExtractor` and memoized `renderItem`.
6. Extract logic into `useXxx` hooks; keep JSX declarative.
7. Add a test file `Component.test.tsx` next to the component.
