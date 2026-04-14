/**
 * Generate Team Report – Form Sheet
 *
 * Lets a commander pick a date range then generate + share a PDF report.
 */

import { useColors } from '@/hooks/ui/useColors';
import { fetchTeamReportData, shareTeamReportPDF } from '@/services/report/teamReport';
import DateTimePicker from '@react-native-community/datetimepicker';
import { subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Mode = 'idle' | 'generating' | 'error';

export default function GenerateTeamReport() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { teamId, teamName } = useLocalSearchParams<{ teamId: string; teamName?: string }>();

  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const resolvedTeamName = teamName ?? t('teams.title');

  async function handleGenerate() {
    if (!teamId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode('generating');
    setErrorMsg('');
    try {
      const data = await fetchTeamReportData({
        teamId,
        teamName: resolvedTeamName,
        startDate,
        endDate,
      });
      await shareTeamReportPDF(data);
      router.back();
    } catch (err: any) {
      setErrorMsg(err?.message ?? t('teams.reportGenerationFailed'));
      setMode('error');
    }
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.card }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Handle */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.indigo + '18' }]}>
          <FileText size={26} color={colors.indigo} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{t('teams.generateTeamReport')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{resolvedTeamName}</Text>
      </View>

      {/* Date Range Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t('teams.reportDateRange').toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {/* Start Date */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowStartPicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>{t('teams.reportStartDate')}</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(startDate)}</Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* End Date */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEndPicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>{t('teams.reportEndDate')}</Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          styles.cta,
          { backgroundColor: colors.indigo },
          mode === 'generating' && styles.ctaDisabled,
        ]}
        onPress={handleGenerate}
        disabled={mode === 'generating'}
        activeOpacity={0.85}
      >
        {mode === 'generating' ? (
          <View style={styles.ctaRow}>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ctaText}>{t('teams.generatingReport')}</Text>
          </View>
        ) : (
          <Text style={styles.ctaText}>{t('teams.generatePdf')}</Text>
        )}
      </TouchableOpacity>

      {mode === 'error' && (
        <Text style={[styles.errorText, { color: '#DC2626' }]}>{errorMsg}</Text>
      )}

      {/* Start Date Picker Modal */}
      <PickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        title={t('teams.reportStartDate')}
        value={startDate}
        onChange={(d) => setStartDate(d)}
        maximumDate={endDate}
        colors={colors}
        bottomInset={insets.bottom}
      />

      {/* End Date Picker Modal */}
      <PickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        title={t('teams.reportEndDate')}
        value={endDate}
        onChange={(d) => setEndDate(d)}
        minimumDate={startDate}
        maximumDate={new Date()}
        colors={colors}
        bottomInset={insets.bottom}
      />
    </ScrollView>
  );
}

// ============================================================================
// PICKER MODAL (matches createTraining.tsx pattern)
// ============================================================================

function PickerModal({
  visible,
  onClose,
  title,
  value,
  onChange,
  minimumDate,
  maximumDate,
  colors,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerCancel, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerHeaderBtn} hitSlop={8}>
              <Text style={[styles.pickerDone, { color: colors.primary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerDivider, { backgroundColor: colors.border }]} />
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            onChange={(_, date) => date && onChange(date)}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.picker}
          />
          <View style={{ height: bottomInset + 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },

  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 4, marginBottom: 16 },

  header: { alignItems: 'center', paddingBottom: 28 },
  headerIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.08, marginBottom: 8 },

  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  dateLabel: { fontSize: 14 },
  dateValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 16 },

  cta: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  ctaDisabled: { opacity: 0.6 },
  ctaRow: { flexDirection: 'row', alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },

  errorText: { fontSize: 13, textAlign: 'center', marginTop: 12 },

  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  pickerHandle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44 },
  pickerHeaderBtn: { minWidth: 60 },
  pickerCancel: { fontSize: 15, fontWeight: '500' },
  pickerTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  pickerDone: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  pickerDivider: { height: 1, marginHorizontal: 16 },
  picker: { height: 180 },
});
