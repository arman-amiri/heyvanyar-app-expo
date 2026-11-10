import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';

import { FontFamilies } from '@/constants/theme';

function getFontFamily(style: TextProps['style']): string {
  const fontWeight = StyleSheet.flatten(style)?.fontWeight;
  const weight =
    typeof fontWeight === 'number'
      ? fontWeight
      : fontWeight === 'bold'
        ? 700
        : fontWeight === 'normal'
          ? 400
          : Number(fontWeight ?? 400);

  if (weight >= 700) return FontFamilies.bold;
  if (weight >= 500) return FontFamilies.medium;
  if (weight <= 300) return FontFamilies.light;
  return FontFamilies.regular;
}

export function AppText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: getFontFamily(style) }, style]} />;
}
