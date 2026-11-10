import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/constants/strings';
import { Colors, FontFamilies } from '@/constants/theme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  // تشخیص حالت ناوبری سه‌دکمه‌ای در اندروید
  const isButtonNavModeAndroid = Platform.OS === 'android' && insets.bottom >= 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          height: 76 + insets.bottom + (isButtonNavModeAndroid ? 8 : 0),
          paddingBottom: insets.bottom + (isButtonNavModeAndroid ? 8 : 0),
          paddingTop: 6,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarLabelStyle: {
          fontSize: 14,
          fontFamily: FontFamilies.regular,
          includeFontPadding: true,
          lineHeight: 28,
        },
      }}>
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.profile,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'person.fill', android: 'person', web: 'person' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: strings.tabs.chat,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{
                ios: 'bubble.left.and.bubble.right.fill',
                android: 'chat',
                web: 'chat',
              }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ads"
        options={{
          title: strings.tabs.ads,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'plus.app.fill', android: 'add_box', web: 'add_box' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="ad-stage-two" options={{ href: null }} />
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.home,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
