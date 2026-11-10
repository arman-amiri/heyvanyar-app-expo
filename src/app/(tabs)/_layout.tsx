import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from 'react-native';

import { strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 20 },
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
      <Tabs.Screen
        name="categories"
        options={{
          title: strings.tabs.categories,
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: 'square.grid.2x2.fill', android: 'category', web: 'category' }}
              size={size}
              tintColor={color}
            />
          ),
        }}
      />
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
