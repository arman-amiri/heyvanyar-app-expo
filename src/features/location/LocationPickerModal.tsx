import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText as Text } from '@/components/app-text';
import { strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { getAuthErrorMessage } from '@/features/auth/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  getLocations,
  type Location,
  type LocationSelectionAction,
} from './locationApi';

interface LocationPickerModalProps {
  visible: boolean;
  selection: LocationSelectionAction[];
  initialLocation?: LocationSelectionAction;
  selectionMode?: 'multiple' | 'single';
  onClose: () => void;
  onConfirm: (
    locationIds: number[],
    selectedLocation?: LocationSelectionAction,
  ) => void;
  onSelectionChange: (selection: LocationSelectionAction[]) => void;
}

type CheckState = 'checked' | 'unchecked' | 'indeterminate';

function getInitialPath(location?: LocationSelectionAction): Location[] {
  if (
    location?.locationId == null ||
    !location.title ||
    location.type === 'iran'
  ) {
    return [];
  }
  return [
    {
      id: location.locationId,
      title: location.title,
      type: location.type,
      parent: null,
    },
  ];
}

const nextLocationType: Record<Location['type'], Location['type']> = {
  ostan: 'shahrestan',
  shahrestan: 'bakhsh',
  bakhsh: 'dehestan',
  dehestan: 'shahr_roosta',
  shahr_roosta: 'shahr_roosta',
};

function combineCheckStates(states: CheckState[]): CheckState {
  if (states.length === 0 || states.every((state) => state === 'unchecked')) {
    return 'unchecked';
  }
  if (states.every((state) => state === 'checked')) return 'checked';
  return 'indeterminate';
}

export function LocationPickerModal({
  visible,
  selection,
  initialLocation,
  selectionMode = 'multiple',
  onClose,
  onConfirm,
  onSelectionChange,
}: LocationPickerModalProps) {
  const [path, setPath] = useState<Location[]>(() => getInitialPath(initialLocation));
  const [confirmError, setConfirmError] = useState(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const queryClient = useQueryClient();
  const currentParent = path[path.length - 1];
  const locationsQuery = useQuery({
    queryKey: ['locations', currentParent?.id ?? null],
    queryFn: () => getLocations(currentParent?.id),
    enabled: visible,
    retry: false,
  });

  const isPathSelected = (pathIds: number[]) => {
    let lastAction: LocationSelectionAction | undefined;
    for (const action of selection) {
      if (
        action.pathIds.length <= pathIds.length &&
        action.pathIds.every((id, index) => pathIds[index] === id)
      ) {
        lastAction = action;
      }
    }
    return lastAction?.selected ?? false;
  };

  const getNodeState = (
    pathIds: number[],
    type: Location['type'],
    loadedChildren?: Location[],
  ): CheckState => {
    const hasDescendantAction = selection.some(
      (action) =>
        action.pathIds.length > pathIds.length &&
        action.pathIds.every((id, index) => pathIds[index] === id),
    );
    const selected = isPathSelected(pathIds);
    if (type === 'shahr_roosta' || !hasDescendantAction) {
      return selected ? 'checked' : 'unchecked';
    }

    const children =
      loadedChildren ??
      queryClient.getQueryData<Location[]>(['locations', pathIds[pathIds.length - 1]]);
    if (!children) return 'indeterminate';
    return combineCheckStates(
      children.map((child) =>
        getNodeState([...pathIds, child.id], child.type),
      ),
    );
  };

  const getIranState = (): CheckState => {
    const hasLocationActions = selection.some((action) => action.pathIds.length > 0);
    if (!hasLocationActions) return isPathSelected([]) ? 'checked' : 'unchecked';

    const provinces =
      queryClient.getQueryData<Location[]>(['locations', null]) ??
      (!currentParent ? locationsQuery.data : undefined);
    if (!provinces) return 'indeterminate';
    if (!provinces.length) return isPathSelected([]) ? 'checked' : 'unchecked';
    return combineCheckStates(
      provinces.map((province) => getNodeState([province.id], province.type)),
    );
  };

  const currentPathIds = path.map((location) => location.id);
  const wholeOptionTitle = currentParent?.title ?? strings.tabs.locationIran;
  const wholeOptionKey = currentParent ? `whole:${currentParent.id}` : 'whole:iran';
  const wholeOptionType = currentParent?.type ?? 'iran';
  const wholeOptionState = currentParent
    ? getNodeState(currentPathIds, currentParent.type, locationsQuery.data)
    : getIranState();
  const titleType = currentParent ? nextLocationType[currentParent.type] : 'ostan';

  const addSelectionAction = (action: LocationSelectionAction) => {
    setConfirmError(false);
    onSelectionChange(
      selectionMode === 'single'
        ? [action]
        : [...selection.filter((previous) => previous.key !== action.key), action],
    );
  };

  const isCoveredByWholeAction = (item: LocationSelectionAction) => {
    let lastAncestorAction: LocationSelectionAction | undefined;
    for (const action of selection) {
      if (
        action.key !== item.key &&
        action.whole &&
        action.pathIds.length < item.pathIds.length &&
        action.pathIds.every((id, index) => item.pathIds[index] === id)
      ) {
        lastAncestorAction = action;
      }
    }
    return lastAncestorAction?.selected ?? false;
  };

  const toggleWholeOption = () => {
    const exactSelection = selection.find((action) => action.key === wholeOptionKey);
    addSelectionAction({
      key: wholeOptionKey,
      title: wholeOptionTitle,
      whole: true,
      pathIds: currentPathIds,
      type: wholeOptionType,
      locationId: currentParent?.id ?? null,
      selected:
        selectionMode === 'single'
          ? !exactSelection?.selected
          : wholeOptionState !== 'checked',
    });
  };

  const toggleLeaf = (location: Location) => {
    const pathIds = [...currentPathIds, location.id];
    const key = `location:${location.id}`;
    const exactSelection = selection.find((action) => action.key === key);
    addSelectionAction({
      key,
      title: location.title,
      whole: false,
      pathIds,
      type: location.type,
      locationId: location.id,
      selected:
        selectionMode === 'single'
          ? !exactSelection?.selected
          : getNodeState(pathIds, location.type) !== 'checked',
    });
  };

  const getSelectedLocationIds = (): number[] | null => {
    if (selectionMode === 'single') {
      const selectedLocation = [...selection]
        .reverse()
        .find(
          (action) =>
            action.selected &&
            action.locationId !== null &&
            isPathSelected(action.pathIds),
        );
      return selectedLocation?.locationId === null || !selectedLocation
        ? []
        : [selectedLocation.locationId];
    }

    const iranState = getIranState();
    if (iranState !== 'indeterminate') return [];

    const provinces = queryClient.getQueryData<Location[]>(['locations', null]);
    if (!provinces) return null;
    const locationIds: number[] = [];

    const collect = (location: Location, pathIds: number[]): boolean => {
      const state = getNodeState(pathIds, location.type);
      if (state === 'unchecked') return true;
      if (state === 'checked') {
        locationIds.push(location.id);
        return true;
      }

      const children = queryClient.getQueryData<Location[]>(['locations', location.id]);
      if (!children) return false;
      return children.every((child) => collect(child, [...pathIds, child.id]));
    };

    if (!provinces.every((province) => collect(province, [province.id]))) return null;
    return locationIds.sort((first, second) => first - second);
  };

  const visibleSelections = selection.filter((item) => {
    if (!item.selected || !isPathSelected(item.pathIds)) return false;
    return !isCoveredByWholeAction(item);
  });

  const removeSelection = (item: LocationSelectionAction) => {
    setConfirmError(false);
    onSelectionChange(
      selection.filter(
        (action) =>
          action.key !== item.key &&
          !(
            item.pathIds.length <= action.pathIds.length &&
            item.pathIds.every((id, index) => action.pathIds[index] === id)
          ),
      ),
    );
  };

  const renderLocation = ({ item }: { item: Location }) => {
    if (item.type === 'shahr_roosta') {
      const pathIds = [...currentPathIds, item.id];
      const state = getNodeState(pathIds, item.type);
      return (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: state === 'indeterminate' ? 'mixed' : state === 'checked',
          }}
          onPress={() => toggleLeaf(item)}
          style={({ pressed }) => [
            styles.leafRow,
            { borderBottomColor: colors.backgroundSelected },
            pressed ? styles.pressed : null,
          ]}>
          <Text style={[styles.leafTitle, { color: colors.text }]}>{item.title}</Text>
          <Checkbox state={state} colors={colors} />
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityLabel={strings.tabs.locationExpand(item.title)}
        accessibilityRole="button"
        onPress={() => setPath((previous) => [...previous, item])}
        style={({ pressed }) => [
          styles.expandRow,
          { borderBottomColor: colors.backgroundSelected },
          pressed ? styles.pressed : null,
        ]}>
        <Text style={[styles.locationTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.rowArrow, { color: colors.textSecondary }]}>‹</Text>
      </Pressable>
    );
  };

  const handleClose = () => {
    setPath(getInitialPath(initialLocation));
    setConfirmError(false);
    onClose();
  };

  const handleConfirm = () => {
    const locationIds = getSelectedLocationIds();
    if (locationIds === null) {
      setConfirmError(true);
      return;
    }
    const selectedLocation =
      selectionMode === 'single'
        ? [...selection]
            .reverse()
            .find(
              (action) =>
                action.selected &&
                action.locationId !== null &&
                isPathSelected(action.pathIds),
            )
        : undefined;
    onConfirm(locationIds, selectedLocation);
    handleClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={strings.tabs.locationClose}
          accessibilityRole="button"
          onPress={handleClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={styles.modalHeader}>
              <Pressable
                accessibilityLabel={strings.tabs.locationClose}
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleClose}
                style={[styles.headerButton, styles.closeButton]}>
                <Text style={[styles.closeText, { color: colors.text }]}>×</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {strings.tabs.locationLevelTitles[titleType]}
              </Text>
              {path.length ? (
                <Pressable
                  accessibilityLabel={strings.tabs.locationBack}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setPath((previous) => previous.slice(0, -1))}
                  style={[styles.headerButton, styles.backButton]}>
                  <Text style={[styles.backArrow, { color: colors.text }]}>‹</Text>
                </Pressable>
              ) : null}
            </View>
            {visibleSelections.length ? (
              <ScrollView
                contentContainerStyle={styles.chipList}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroller}>
                {visibleSelections.map((item) => {
                  const label = item.whole
                    ? strings.tabs.locationWhole(item.title)
                    : item.title;
                  return (
                    <View
                      key={item.key}
                      style={[styles.selectionChip, { borderColor: colors.backgroundSelected }]}>
                      <Text style={[styles.chipTitle, { color: colors.text }]}>{label}</Text>
                      <Pressable
                        accessibilityLabel={strings.tabs.locationRemoveSelection(label)}
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() => removeSelection(item)}
                        style={styles.removeChipButton}>
                        <Text style={[styles.removeChipText, { color: colors.textSecondary }]}>
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
          {selectionMode === 'multiple' || currentParent ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={strings.tabs.locationWhole(wholeOptionTitle)}
              accessibilityState={{
                checked:
                  wholeOptionState === 'indeterminate'
                    ? 'mixed'
                    : wholeOptionState === 'checked',
              }}
              onPress={toggleWholeOption}
              style={({ pressed }) => [
                styles.selectWholeRow,
                { borderBottomColor: colors.backgroundSelected },
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.wholeOptionText, { color: colors.text }]}>
                {strings.tabs.locationWhole(wholeOptionTitle)}
              </Text>
              <Checkbox state={wholeOptionState} colors={colors} />
            </Pressable>
          ) : null}
          {locationsQuery.isPending ? (
            <View style={styles.queryState}>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary }}>{strings.tabs.categoryLoading}</Text>
            </View>
          ) : locationsQuery.isError ? (
            <View style={styles.queryState}>
              <Text accessibilityRole="alert" style={[styles.errorMessage, { color: colors.error }]}>
                {getAuthErrorMessage(locationsQuery.error, strings.tabs.locationLoadingError)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void locationsQuery.refetch()}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.onPrimary }}>{strings.common.retry}</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={locationsQuery.data}
              keyExtractor={(item) => String(item.id)}
              ListEmptyComponent={
                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                  {strings.tabs.locationEmpty}
                </Text>
              }
              renderItem={renderLocation}
              style={styles.locationList}
            />
          )}
          {confirmError ? (
            <Text accessibilityRole="alert" style={[styles.errorMessage, { color: colors.error }]}>
              {strings.tabs.locationSelectionError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmButton,
              { backgroundColor: colors.primary },
              pressed ? styles.pressed : null,
            ]}>
            <Text style={[styles.confirmButtonText, { color: colors.onPrimary }]}>
              {strings.tabs.locationConfirm}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Checkbox({
  state,
  colors,
}: {
  state: CheckState;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const checked = state === 'checked';
  return (
    <View
      style={[
        styles.checkbox,
        {
          borderColor: state === 'unchecked' ? colors.textSecondary : colors.primary,
          backgroundColor: checked ? colors.primary : 'transparent',
        },
      ]}>
      {checked ? <Text style={[styles.checkmark, { color: colors.onPrimary }]}>✓</Text> : null}
      {state === 'indeterminate' ? (
        <View style={[styles.indeterminateMark, { backgroundColor: colors.primary }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: Colors.light.overlay, opacity: 0.48 },
  modalCard: {
    height: '70%',
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    width: '100%',
  },
  header: { flexShrink: 0 },
  modalHeader: {
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
    position: 'relative',
  },
  modalTitle: { fontSize: 16, fontWeight: '500', textAlign: 'center' },
  headerButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    top: 8,
    width: 40,
  },
  closeButton: { right: 0 },
  closeText: { fontSize: 28, lineHeight: 32 },
  backButton: { left: 0 },
  backArrow: { fontSize: 28, lineHeight: 32 },
  chipList: {
    alignItems: 'center',
    direction: 'rtl',
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    minHeight: 42,
    paddingHorizontal: Spacing.one,
  },
  chipScroller: { direction: 'rtl' },
  selectionChip: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    gap: Spacing.one,
    minHeight: 32,
    paddingHorizontal: Spacing.two,
  },
  chipTitle: { fontSize: 12 },
  removeChipButton: { alignItems: 'center', height: 22, justifyContent: 'center', width: 18 },
  removeChipText: { fontSize: 17, lineHeight: 20 },
  locationList: { flex: 1 },
  selectWholeRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    justifyContent: 'flex-start',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leafRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    justifyContent: 'flex-start',
    minHeight: 44,
    paddingHorizontal: Spacing.two,
  },
  wholeOptionText: { fontSize: 14, textAlign: 'right' },
  leafTitle: { fontSize: 14, textAlign: 'right' },
  locationTitle: { flex: 1, fontSize: 14, textAlign: 'right' },
  checkbox: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkmark: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  indeterminateMark: { borderRadius: 2, height: 2, width: 10 },
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
  confirmButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: Spacing.two,
    minHeight: 48,
  },
  confirmButtonText: { fontSize: 15, fontWeight: '600' },
  retryButton: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.four,
  },
  pressed: { opacity: 0.7 },
});
