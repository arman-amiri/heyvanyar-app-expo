import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { useAdDraftStore, type DraftPhoto, type DraftVideo } from '@/features/ads/draftStore';
import { AdVideoPreview } from '@/features/ads/AdVideoPreview';
import {
  createMediaKey,
  deleteStoredMedia,
  savePickedMedia,
} from '@/features/ads/mediaStorage';
import { uploadAdImage, uploadAdVideo } from '@/features/ads/uploadApi';
import { CategoryPickerModal } from '@/features/ads/CategoryPickerModal';
import type { Category } from '@/features/ads/categoryApi';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';

export default function AdsScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const draftStatus = useAdDraftStore((state) => state.status);
  const photos = useAdDraftStore((state) => state.photos);
  const video = useAdDraftStore((state) => state.video);
  const category = useAdDraftStore((state) => state.category);
  const hydrate = useAdDraftStore((state) => state.hydrate);
  const addPhoto = useAdDraftStore((state) => state.addPhoto);
  const updatePhoto = useAdDraftStore((state) => state.updatePhoto);
  const setPrimaryPhoto = useAdDraftStore((state) => state.setPrimaryPhoto);
  const removePhotoFromDraft = useAdDraftStore((state) => state.removePhoto);
  const setVideo = useAdDraftStore((state) => state.setVideo);
  const clearDraft = useAdDraftStore((state) => state.clearDraft);
  const setCategory = useAdDraftStore((state) => state.setCategory);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPicking, setIsPicking] = useState(false);
  const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const pickerLock = useRef(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace({ pathname: '/(auth)/login', params: { returnTo: 'ads' } });
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated' && draftStatus === 'idle') {
      void hydrate().catch((error: unknown) => {
        setErrorMessage(getAuthErrorMessage(error, strings.tabs.draftRestoreError));
      });
    }
  }, [authStatus, draftStatus, hydrate]);

  const setUploadError = useCallback((error: unknown) => {
    setErrorMessage(getAuthErrorMessage(error, strings.tabs.mediaUploadFailed));
  }, []);

  const startPhotoUpload = useCallback(
    async (photo: DraftPhoto) => {
      if (
        uploadControllers.current.has(photo.key) ||
        !useAdDraftStore.getState().photos.some((item) => item.key === photo.key)
      ) {
        return;
      }
      const controller = new AbortController();
      uploadControllers.current.set(photo.key, controller);
      try {
        let result: { id: number };
        try {
          result = await uploadAdImage(
            photo.key,
            photo.uri,
            photo.fileName,
            controller.signal,
          );
        } catch (error) {
          if (controller.signal.aborted) return;
          try {
            await updatePhoto(photo.key, { status: 'failed' });
          } catch (storageError) {
            setUploadError(storageError);
          }
          setUploadError(error);
          return;
        }
        if (controller.signal.aborted) return;
        try {
          await updatePhoto(photo.key, { id: result.id, status: 'uploaded' });
        } catch (error) {
          setUploadError(error);
        }
      } finally {
        if (uploadControllers.current.get(photo.key) === controller) {
          uploadControllers.current.delete(photo.key);
        }
      }
    },
    [setUploadError, updatePhoto],
  );

  const startVideoUpload = useCallback(
    async (draftVideo: DraftVideo) => {
      if (
        uploadControllers.current.has(draftVideo.key) ||
        useAdDraftStore.getState().video?.key !== draftVideo.key
      ) {
        return;
      }
      const controller = new AbortController();
      uploadControllers.current.set(draftVideo.key, controller);
      try {
        let result: { storedName: string };
        try {
          result = await uploadAdVideo(
            draftVideo.key,
            draftVideo.uri,
            draftVideo.fileName,
            controller.signal,
          );
        } catch (error) {
          if (controller.signal.aborted) return;
          const currentVideo = useAdDraftStore.getState().video;
          if (currentVideo?.key === draftVideo.key) {
            try {
              await setVideo({ ...draftVideo, status: 'failed' });
            } catch (storageError) {
              setUploadError(storageError);
            }
          }
          setUploadError(error);
          return;
        }
        if (controller.signal.aborted) return;
        const currentVideo = useAdDraftStore.getState().video;
        if (currentVideo?.key === draftVideo.key) {
          try {
            await setVideo({
              ...draftVideo,
              storedName: result.storedName,
              status: 'uploaded',
            });
          } catch (error) {
            setUploadError(error);
          }
        }
      } finally {
        if (uploadControllers.current.get(draftVideo.key) === controller) {
          uploadControllers.current.delete(draftVideo.key);
        }
      }
    },
    [setUploadError, setVideo],
  );

  const requestMediaPermission = async (): Promise<boolean> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;
    setErrorMessage(strings.tabs.mediaPermissionDenied);
    return false;
  };

  const handleAddPhoto = async () => {
    if (pickerLock.current) return;
    if (useAdDraftStore.getState().photos.length >= 10) {
      setErrorMessage(strings.tabs.photoLimit);
      return;
    }

    pickerLock.current = true;
    setIsPicking(true);
    setErrorMessage('');
    try {
      if (!(await requestMediaPermission())) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        quality: 1,
      });
      if (result.canceled) return;

      const key = createMediaKey();
      const stored = await savePickedMedia(result.assets[0], key);
      const photo: DraftPhoto = { ...stored, status: 'uploading' };
      try {
        await addPhoto(photo);
      } catch (error) {
        try {
          await removePhotoFromDraft(key);
        } catch (storageError) {
          setUploadError(storageError);
        }
        await deleteStoredMedia(stored.key, stored.uri);
        throw error;
      }
      void startPhotoUpload(photo);
    } catch (error) {
      setUploadError(error);
    } finally {
      pickerLock.current = false;
      setIsPicking(false);
    }
  };

  const handleChooseVideo = async () => {
    if (pickerLock.current) return;
    pickerLock.current = true;
    setIsPicking(true);
    setErrorMessage('');
    try {
      if (!(await requestMediaPermission())) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
      });
      if (result.canceled) return;

      const previousVideo = useAdDraftStore.getState().video;
      if (previousVideo) uploadControllers.current.get(previousVideo.key)?.abort();

      const key = createMediaKey();
      const stored = await savePickedMedia(result.assets[0], key);
      const newVideo: DraftVideo = { ...stored, status: 'uploading' };
      try {
        await setVideo(newVideo);
      } catch (error) {
        try {
          await setVideo(previousVideo);
        } catch (storageError) {
          setUploadError(storageError);
        }
        await deleteStoredMedia(stored.key, stored.uri);
        throw error;
      }

      void startVideoUpload(newVideo);
      if (previousVideo) {
        void deleteStoredMedia(previousVideo.key, previousVideo.uri).catch(setUploadError);
      }
    } catch (error) {
      setUploadError(error);
    } finally {
      pickerLock.current = false;
      setIsPicking(false);
    }
  };

  const handleRemovePhoto = async (photo: DraftPhoto) => {
    uploadControllers.current.get(photo.key)?.abort();
    setErrorMessage('');
    try {
      const removed = await removePhotoFromDraft(photo.key);
      if (removed) await deleteStoredMedia(removed.key, removed.uri);
    } catch (error) {
      setUploadError(error);
    }
  };

  const handleRemoveVideo = async () => {
    if (!video) return;
    uploadControllers.current.get(video.key)?.abort();
    setErrorMessage('');
    try {
      await setVideo(null);
      await deleteStoredMedia(video.key, video.uri);
    } catch (error) {
      setUploadError(error);
    }
  };

  const handleCancel = async () => {
    uploadControllers.current.forEach((controller) => controller.abort());
    uploadControllers.current.clear();
    setErrorMessage('');
    try {
      const draft = await clearDraft();
      const cleanupResults = await Promise.allSettled([
        ...draft.photos.map((photo) => deleteStoredMedia(photo.key, photo.uri)),
        ...(draft.video ? [deleteStoredMedia(draft.video.key, draft.video.uri)] : []),
      ]);
      if (cleanupResults.some((result) => result.status === 'rejected')) {
        Alert.alert(strings.tabs.mediaCleanupError);
      }
      router.replace('/(tabs)');
    } catch (error) {
      setUploadError(error);
    }
  };

  const handleRetryPhoto = (photo: DraftPhoto) => {
    setErrorMessage('');
    void updatePhoto(photo.key, { status: 'uploading' })
      .then(() => startPhotoUpload({ ...photo, status: 'uploading' }))
      .catch(setUploadError);
  };

  const handleRetryVideo = () => {
    if (!video) return;
    setErrorMessage('');
    const retryVideo: DraftVideo = { ...video, status: 'uploading' };
    void setVideo(retryVideo)
      .then(() => startVideoUpload(retryVideo))
      .catch(setUploadError);
  };

  const handleSelectCategory = (selectedCategory: Category) => {
    setErrorMessage('');
    void setCategory({
      categoryId: selectedCategory.id,
      title: selectedCategory.title,
    }).catch(
      (error: unknown) =>
        setErrorMessage(getAuthErrorMessage(error, strings.tabs.categorySaveError)),
    );
  };

  const hasPendingUpload =
    photos.some((photo) => photo.status === 'uploading') || video?.status === 'uploading';

  if (authStatus !== 'authenticated') return null;

  if (draftStatus === 'idle' || draftStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary }}>{strings.tabs.loadingDraft}</Text>
      </SafeAreaView>
    );
  }

  if (draftStatus === 'error') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.text }]}>{errorMessage}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setErrorMessage('');
            void hydrate().catch((error: unknown) =>
              setErrorMessage(getAuthErrorMessage(error, strings.tabs.draftRestoreError)),
            );
          }}
          style={[styles.smallButton, { backgroundColor: colors.text }]}>
          <Text style={{ color: colors.background }}>{strings.common.retry}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void handleCancel()}>
          <Text style={{ color: colors.textSecondary }}>{strings.tabs.cancelAd}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{strings.tabs.createAdTitle}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleCancel()}
            style={({ pressed }) => [
              styles.headerCancelButton,
              { borderColor: colors.backgroundSelected },
              pressed ? styles.pressed : null,
            ]}>
            <Text style={[styles.headerCancelText, { color: colors.text }]}>
              {strings.tabs.cancelAdCreation}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {strings.tabs.createAdDescription}
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.categoryTitle, { color: colors.text }]}>
            {strings.tabs.selectCategory}
          </Text>
          <Pressable
            accessibilityLabel={category?.title ?? strings.tabs.selectCategory}
            accessibilityRole="button"
            onPress={() => setIsCategoryPickerVisible(true)}
            style={[
              styles.categoryInput,
              { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
            ]}>
            <Text
              style={[
                styles.categoryInputText,
                { color: category ? colors.text : colors.textSecondary },
              ]}>
              {category?.title ?? strings.tabs.selectCategory}
            </Text>
            <SymbolView
              name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }}
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.photoSectionHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {strings.tabs.photosTitle}
            </Text>
            <Text style={[styles.counter, { color: colors.textSecondary }]}>
              {photos.length}/10
            </Text>
          </View>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            {strings.tabs.photosDescription}
          </Text>

          <View style={styles.photoList}>
            {photos.map((photo, index) => (
              <View key={photo.key} style={styles.photoItem}>
                <Pressable
                  accessibilityLabel={
                    index === 0 ? strings.tabs.mainPhoto : strings.tabs.selectMainPhoto
                  }
                  accessibilityRole="button"
                  onPress={() => {
                    void setPrimaryPhoto(photo.key).catch(setUploadError);
                  }}
                  style={[
                    styles.photoButton,
                    index === 0 ? styles.primaryPhoto : null,
                  ]}>
                  <Image
                    source={{ uri: photo.previewUri }}
                    style={[
                      styles.thumbnail,
                      { opacity: photo.status === 'uploaded' ? 1 : 0.45 },
                    ]}
                  />
                  {photo.status !== 'uploaded' ? (
                    <View style={styles.uploadOverlay}>
                      {photo.status === 'uploading' ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.failedMark}>!</Text>
                      )}
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel={strings.tabs.removeMedia}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => void handleRemovePhoto(photo)}
                  style={styles.removeButton}>
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={14}
                    tintColor="#b3261e"
                  />
                </Pressable>
                {index === 0 ? (
                  <Text numberOfLines={1} style={[styles.primaryLabel, { color: colors.text }]}>
                    {strings.tabs.mainPhoto}
                  </Text>
                ) : photo.status === 'failed' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleRetryPhoto(photo)}>
                    <Text style={[styles.retryLabel, { color: colors.textSecondary }]}>
                      {strings.tabs.retryUpload}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {photos.length < 10 ? (
              <Pressable
                accessibilityLabel={strings.tabs.addPhoto}
                accessibilityRole="button"
                disabled={isPicking}
                onPress={() => void handleAddPhoto()}
                style={[
                  styles.mediaPickerButton,
                  { borderColor: colors.textSecondary },
                  isPicking ? styles.disabled : null,
                ]}>
                {isPicking ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <SymbolView
                    name={{ ios: 'photo', android: 'image', web: 'image' }}
                    size={28}
                    tintColor={colors.textSecondary}
                  />
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {strings.tabs.videoTitle}
          </Text>
          {!video ? (
            <Text style={[styles.helper, { color: colors.textSecondary }]}>
              {strings.tabs.noVideoSelected}
            </Text>
          ) : null}
          <View style={styles.videoPickerRow}>
            <Pressable
              accessibilityLabel={video ? strings.tabs.replaceVideo : strings.tabs.chooseVideo}
              accessibilityRole="button"
              disabled={isPicking}
              onPress={() => void handleChooseVideo()}
              style={[
                styles.mediaPickerButton,
                { borderColor: colors.textSecondary },
                isPicking ? styles.disabled : null,
              ]}>
              {isPicking ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <SymbolView
                  name={{ ios: 'video', android: 'videocam', web: 'videocam' }}
                  size={28}
                  tintColor={colors.textSecondary}
                />
              )}
            </Pressable>
          </View>
          {video ? (
            <>
              <AdVideoPreview uri={video.previewUri} />
              <View style={[styles.videoCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.videoInfo}>
                  <Text numberOfLines={1} style={[styles.videoName, { color: colors.text }]}>
                    {video.fileName}
                  </Text>
                  {video.status === 'uploading' ? (
                    <View style={styles.uploadingRow}>
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                      <Text style={[styles.videoStatus, { color: colors.textSecondary }]}>
                        {strings.tabs.uploadingMedia}
                      </Text>
                    </View>
                  ) : video.status === 'failed' ? (
                    <Pressable accessibilityRole="button" onPress={handleRetryVideo}>
                      <Text style={[styles.retryLabel, { color: colors.textSecondary }]}>
                        {strings.tabs.retryUpload}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel={strings.tabs.removeMedia}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => void handleRemoveVideo()}>
                  <Text style={[styles.removeVideoText, { color: colors.textSecondary }]}>×</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          disabled={isPicking}
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [
            styles.footerButton,
            styles.cancelButton,
            { borderColor: colors.backgroundSelected },
            pressed && !isPicking ? styles.pressed : null,
            isPicking ? styles.disabled : null,
          ]}>
          <Text style={[styles.cancelText, { color: colors.text }]}>{strings.tabs.backAd}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: hasPendingUpload || isPicking || !category }}
          disabled={hasPendingUpload || isPicking || !category}
          onPress={() => router.push('/ad-stage-two')}
          style={({ pressed }) => [
            styles.footerButton,
            { backgroundColor: colors.text },
            pressed && !hasPendingUpload && !isPicking && category ? styles.pressed : null,
            hasPendingUpload || isPicking || !category ? styles.disabled : null,
          ]}>
          <Text style={[styles.continueText, { color: colors.background }]}>
            {strings.tabs.continueAd}
          </Text>
        </Pressable>
      </View>
      <CategoryPickerModal
        onClose={() => setIsCategoryPickerVisible(false)}
        onSelect={handleSelectCategory}
        visible={isCategoryPickerVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  scrollContent: { gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.three },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'right' },
  headerCancelButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
  headerCancelText: { fontSize: 13, fontWeight: '600' },
  description: { fontSize: 15, lineHeight: 25, textAlign: 'right' },
  section: { gap: Spacing.two },
  categoryTitle: { fontSize: 16 },
  categoryInput: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  categoryInputText: { flex: 1, fontSize: 15, textAlign: 'right' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  photoSectionHeader: { flexDirection: 'row-reverse' },
  sectionTitle: { fontSize: 18, fontWeight: '700', textAlign: 'right' },
  counter: { fontSize: 14 },
  helper: { fontSize: 14, lineHeight: 22, textAlign: 'right' },
  photoList: { alignItems: 'flex-start', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  photoItem: { alignItems: 'center', gap: 3, minHeight: 104, position: 'relative', width: 92 },
  photoButton: {
    borderRadius: 4,
    height: 80,
    overflow: 'hidden',
    width: 80,
  },
  primaryPhoto: { borderColor: '#208AEF', borderWidth: 2 },
  thumbnail: { height: 80, width: 80 },
  uploadOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  failedMark: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#e6e6e6',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: -8,
    width: 24,
  },
  primaryLabel: { fontSize: 9, maxWidth: 92, textAlign: 'center' },
  retryLabel: { fontSize: 10, textAlign: 'center', textDecorationLine: 'underline' },
  mediaPickerButton: {
    alignItems: 'center',
    borderRadius: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: 80,
  },
  videoPickerRow: { flexDirection: 'row-reverse' },
  videoCard: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: Spacing.three,
  },
  videoInfo: { flex: 1, gap: Spacing.one },
  videoName: { fontSize: 14, textAlign: 'right' },
  videoStatus: { fontSize: 12 },
  uploadingRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one },
  removeVideoText: { fontSize: 24 },
  footer: {
    borderTopColor: '#e5e5e5',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: 8,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: { borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  continueText: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
  error: { color: '#c62828', lineHeight: 22, paddingHorizontal: Spacing.four, textAlign: 'right' },
  smallButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
});
