import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  getCategoryChildren,
  getParentCategories,
  type Category,
} from './categoryApi';

interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
}

export function CategoryPickerModal({
  visible,
  onClose,
  onSelect,
}: CategoryPickerModalProps) {
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const parentsQuery = useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: getParentCategories,
    enabled: visible,
  });
  const childrenQuery = useQuery({
    queryKey: ['categories', 'children', selectedParent?.id],
    queryFn: () => {
      if (!selectedParent) throw new Error(strings.auth.invalidResponse);
      return getCategoryChildren(selectedParent.id);
    },
    enabled: visible && selectedParent !== null,
  });

  const handleClose = () => {
    setSelectedParent(null);
    onClose();
  };

  const renderCategories = (
    categories: Category[],
    emptyMessage: string,
    onPress: (category: Category) => void,
  ) => (
    <FlatList
      data={categories}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          {emptyMessage}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onPress(item)}
          style={({ pressed }) => [
            styles.categoryRow,
            { borderBottomColor: colors.backgroundSelected },
            pressed ? styles.pressed : null,
          ]}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.rowArrow, { color: colors.textSecondary }]}>‹</Text>
        </Pressable>
      )}
      style={styles.categoryList}
    />
  );

  const renderQueryState = (
    isPending: boolean,
    isError: boolean,
    error: Error | null,
    refetch: () => void,
    children: React.ReactNode,
  ) => {
    if (isPending) {
      return (
        <View style={styles.queryState}>
          <ActivityIndicator color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary }}>{strings.tabs.categoryLoading}</Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.queryState}>
          <Text accessibilityRole="alert" style={[styles.errorMessage, { color: colors.text }]}>
            {getAuthErrorMessage(error, strings.tabs.categoryLoadingError)}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
            style={[styles.retryButton, { backgroundColor: colors.text }]}>
            <Text style={{ color: colors.background }}>{strings.common.retry}</Text>
          </Pressable>
        </View>
      );
    }

    return children;
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={strings.tabs.categoryClose}
          accessibilityRole="button"
          onPress={handleClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            {selectedParent ? (
              <Pressable
                accessibilityLabel={strings.tabs.categoryBack}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSelectedParent(null)}
                style={styles.backButton}>
                <Text style={[styles.backArrow, { color: colors.text }]}>←</Text>
              </Pressable>
            ) : null}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedParent?.title ?? strings.tabs.categoryModalTitle}
            </Text>
          </View>

          {selectedParent
            ? renderQueryState(
                childrenQuery.isPending,
                childrenQuery.isError,
                childrenQuery.error,
                () => {
                  void childrenQuery.refetch();
                },
                renderCategories(
                  childrenQuery.data ?? [],
                  strings.tabs.categoryChildrenEmpty,
                  (item) => {
                    onSelect(item);
                    handleClose();
                  },
                ),
              )
            : renderQueryState(
                parentsQuery.isPending,
                parentsQuery.isError,
                parentsQuery.error,
                () => {
                  void parentsQuery.refetch();
                },
                renderCategories(
                  parentsQuery.data ?? [],
                  strings.tabs.categoryParentsEmpty,
                  setSelectedParent,
                ),
              )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.48)' },
  modalCard: {
    borderRadius: 0,
    height: '60%',
    overflow: 'hidden',
    padding: Spacing.three,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    position: 'relative',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  backButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    width: 40,
  },
  backArrow: { fontSize: 24 },
  categoryList: { flexGrow: 0, marginTop: Spacing.two },
  categoryRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  categoryTitle: { flex: 1, fontSize: 15, textAlign: 'right' },
  rowArrow: { fontSize: 24, marginStart: Spacing.two },
  emptyMessage: { padding: Spacing.three, textAlign: 'center' },
  queryState: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  errorMessage: { fontSize: 14, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
  pressed: { opacity: 0.7 },
});
