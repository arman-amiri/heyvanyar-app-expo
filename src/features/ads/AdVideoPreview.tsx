import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Colors } from '@/constants/theme';

interface AdVideoPreviewProps {
  uri: string;
}

export function AdVideoPreview({ uri }: AdVideoPreviewProps) {
  const player = useVideoPlayer(uri);

  return (
    <View style={styles.container}>
      <VideoView
        contentFit="contain"
        nativeControls
        player={player}
        style={styles.video}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surfaceMuted,
    height: 200,
  },
  video: {
    height: 200,
    width: '100%',
  },
});
