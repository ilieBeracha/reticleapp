/**
 * GlobalSearchSheet - Command-palette-style fuzzy search across sessions,
 * weapons, and (in team mode) teammates. Uses Gorhom's BottomSheetModal.
 *
 * Triggered via `openGlobalSearch()` from anywhere. Closes on row select or
 * when the user dismisses the sheet.
 */

import { useGlobalSearchIndex, type SearchEntry } from '@/hooks/useGlobalSearchIndex';
import { useColors } from '@/hooks/ui/useColors';
import { closeGlobalSearch, useGlobalSearchStore } from '@/stores/globalSearchStore';
import { fuzzySearch } from '@/utils/fuzzySearch';
import { BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Crosshair, Search as SearchIcon, Target, User } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const MAX_RESULTS = 40;

export function GlobalSearchSheet() {
  const colors = useColors();
  const { t } = useTranslation();
  const isOpen = useGlobalSearchStore((s) => s.isOpen);
  const sheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState('');

  const { entries, loading } = useGlobalSearchIndex(isOpen);

  // Open/close the native sheet when store state flips.
  useEffect(() => {
    if (isOpen) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return entries.slice(0, MAX_RESULTS);
    return fuzzySearch(entries, query, (e) => e.haystack)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [entries, query]);

  const handleSelect = (entry: SearchEntry) => {
    closeGlobalSearch();
    if (entry.href) {
      // Defer navigation so the sheet can finish dismissing first.
      setTimeout(() => router.push(entry.href as any), 120);
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={['92%']}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onDismiss={() => closeGlobalSearch()}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={styles.container}>
        <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <SearchIcon size={18} color={colors.textMuted} />
          <BottomSheetTextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('search.placeholder', { defaultValue: 'Search sessions, weapons, teammates…' })}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <View style={styles.resultsList}>
          {results.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {loading
                  ? t('search.loading', { defaultValue: 'Loading…' })
                  : query.trim()
                    ? t('search.noResults', { defaultValue: 'No matches' })
                    : t('search.startTyping', { defaultValue: 'Start typing to search' })}
              </Text>
            </View>
          ) : (
            results.map((entry) => (
              <ResultRow key={entry.id} entry={entry} onPress={() => handleSelect(entry)} />
            ))
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function ResultRow({ entry, onPress }: { entry: SearchEntry; onPress: () => void }) {
  const colors = useColors();
  const Icon = iconFor(entry.kind);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.secondary : 'transparent', borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.secondary }]}>
        <Icon size={16} color={colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
          {entry.label}
        </Text>
        {entry.sublabel ? (
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
            {entry.sublabel}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.kindTag, { color: colors.textMuted, borderColor: colors.border }]}>
        {entry.kind}
      </Text>
    </Pressable>
  );
}

function iconFor(kind: SearchEntry['kind']) {
  switch (kind) {
    case 'session':
      return Target;
    case 'weapon':
      return Crosshair;
    case 'member':
      return User;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  resultsList: { flex: 1, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  kindTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyWrap: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '500' },
});
