import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.adsTitle}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {strings.tabs.adsDescription}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, gap: Spacing.three, justifyContent: 'center', padding: Spacing.four },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'right' },
  description: { fontSize: 16, lineHeight: 26, textAlign: 'right' },
});
