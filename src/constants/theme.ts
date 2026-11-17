/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A2A30',
    background: '#FFFFFF',
    backgroundElement: '#F4F4F5',
    backgroundSelected: '#E4E4E7',
    textSecondary: '#71717A',
    primary: '#7E2EC3',
    onPrimary: '#FFFFFF',
    secondary: '#71717A',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F4F5',
    border: '#E4E4E7',
    textMuted: '#71717A',
    textSubtle: '#A1A1AA',
    icon: '#2A2A30',
    iconMuted: '#808080',
    overlay: '#000000',
    error: '#C32E2E',
    success: '#15803D',
  },
  dark: {
    text: '#2A2A30',
    background: '#FFFFFF',
    backgroundElement: '#F4F4F5',
    backgroundSelected: '#E4E4E7',
    textSecondary: '#71717A',
    primary: '#7E2EC3',
    onPrimary: '#FFFFFF',
    secondary: '#71717A',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F4F5',
    border: '#E4E4E7',
    textMuted: '#71717A',
    textSubtle: '#A1A1AA',
    icon: '#2A2A30',
    iconMuted: '#808080',
    overlay: '#000000',
    error: '#C32E2E',
    success: '#15803D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const FontFamilies = {
  regular: 'IRANSans',
  light: 'IRANSansLight',
  medium: 'IRANSansMedium',
  bold: 'IRANSansBold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
