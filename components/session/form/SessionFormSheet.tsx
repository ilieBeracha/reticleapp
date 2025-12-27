/**
 * SessionFormSheet - Solo session creation form
 *
 * Refined tactical design - monochromatic, professional
 * Uses shared DrillFormComponents for consistent UI.
 *
 * Rules:
 * - Grouping + Scan → only distance + time (AI detects shots)
 * - Grouping + Manual → all fields
 * - Achievement → all fields
 * - Scan mode → watch control disabled
 */

import { WatchControlPrompt } from '@/components/session/WatchControlPrompt';
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  ChevronRight,
  Crosshair,
  Hand,
  Play,
  Target,
  Trophy,
  Watch,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ConfigCard,
  ConfigRow,
  HintBox,
  OptionCard,
  SectionLabel,
  TimeRow,
} from './DrillFormComponents';
import {
  DISTANCE_PRESETS,
  ROUNDS_PRESETS,
  SHOTS_PRESETS,
  TIME_PRESETS,
  type UseSessionFormReturn,
} from './useSessionForm';

// ============================================================================
// COMPONENT
// ============================================================================

interface SessionFormSheetProps {
  form: UseSessionFormReturn;
  title?: string;
  submitLabel?: string;
  showNameInput?: boolean;
}

export function SessionFormSheet({
  form,
  title = 'Solo Practice',
  submitLabel = 'Start Session',
  showNameInput = false,
}: SessionFormSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Grouping + Scan = minimal mode (only distance + time)
  const isMinimalMode = form.state.drillGoal === 'grouping' && form.state.inputMethod === 'scan';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
          <Target size={20} color={colors.text} strokeWidth={1.5} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Configure your training parameters
        </Text>
      </View>

      {/* Name Input */}
      {showNameInput && (
        <View style={styles.section}>
          <SectionLabel>SESSION NAME</SectionLabel>
          <TextInput
            style={[
              styles.nameInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="Optional name..."
            placeholderTextColor={colors.textMuted}
            value={form.state.name}
            onChangeText={form.setName}
          />
        </View>
      )}

      {/* Objective Selection */}
      <View style={styles.section}>
        <SectionLabel>OBJECTIVE</SectionLabel>
        <View style={styles.optionGroup}>
          <OptionCard
            icon={<Crosshair size={18} color={colors.text} strokeWidth={1.5} />}
            label="Grouping"
            description="Measure shot dispersion"
            active={form.state.drillGoal === 'grouping'}
            onPress={() => form.setDrillGoal('grouping')}
          />
          <OptionCard
            icon={<Trophy size={18} color={colors.text} strokeWidth={1.5} />}
            label="Achievement"
            description="Zone-based scoring"
            active={form.state.drillGoal === 'achievement'}
            onPress={() => form.setDrillGoal('achievement')}
          />
        </View>
      </View>

      {/* Input Method Selection */}
      <View style={styles.section}>
        <SectionLabel>INPUT METHOD</SectionLabel>
        <View style={styles.optionGroup}>
          <OptionCard
            icon={<Camera size={18} color={colors.text} strokeWidth={1.5} />}
            label="Scan"
            description="AI target detection"
            active={form.state.inputMethod === 'scan'}
            onPress={() => form.setInputMethod('scan')}
          />
          <OptionCard
            icon={<Hand size={18} color={colors.text} strokeWidth={1.5} />}
            label="Manual"
            description="Mark shots yourself"
            active={form.state.inputMethod === 'manual'}
            onPress={() => form.setInputMethod('manual')}
          />
        </View>
      </View>

      {/* Scan + Grouping hint */}
      {isMinimalMode && (
        <HintBox>Shot count will be detected automatically from scanned target</HintBox>
      )}

      {/* Configuration */}
      <View style={styles.section}>
        <SectionLabel>PARAMETERS</SectionLabel>
        <ConfigCard>
          {/* Distance - always shown */}
          <ConfigRow
            label="Distance"
            unit="meters"
            value={form.state.distance}
            onChange={form.setDistance}
            presets={DISTANCE_PRESETS}
          />

          {/* Shots - hidden for grouping+scan */}
          {!isMinimalMode && (
            <ConfigRow
              label="Shots"
              unit="per target"
              value={form.state.shots}
              onChange={form.setShots}
              presets={SHOTS_PRESETS}
            />
          )}

          {/* Rounds - hidden for grouping+scan */}
          {!isMinimalMode && (
            <ConfigRow
              label="Rounds"
              unit="targets"
              value={form.state.rounds}
              onChange={form.setRounds}
              presets={ROUNDS_PRESETS}
            />
          )}

          {/* Time */}
          <TimeRow
            value={form.state.timeLimit}
            onChange={form.setTimeLimit}
            presets={TIME_PRESETS}
            isLast
          />
        </ConfigCard>
      </View>

      {/* Watch hint */}
      {form.isWatchConnected && (
        <View
          style={[
            styles.watchHint,
            {
              backgroundColor: colors.card,
              borderColor: form.canUseWatch ? colors.accent : colors.border,
            },
          ]}
        >
          <Watch
            size={16}
            color={form.canUseWatch ? colors.accent : colors.textMuted}
            strokeWidth={1.5}
          />
          <View style={styles.watchHintContent}>
            <Text
              style={[
                styles.watchHintTitle,
                { color: form.canUseWatch ? colors.text : colors.textMuted },
              ]}
            >
              {form.canUseWatch ? 'Watch Connected' : 'Watch Unavailable'}
            </Text>
            <Text style={[styles.watchHintSub, { color: colors.textMuted }]}>
              {form.canUseWatch
                ? 'Control option available after submit'
                : 'Scan mode requires phone control'}
            </Text>
          </View>
          {form.canUseWatch && <ChevronRight size={16} color={colors.textMuted} />}
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          {
            backgroundColor: colors.primary,
            marginBottom: insets.bottom + 16,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          form.submit();
        }}
        disabled={form.isSubmitting}
        activeOpacity={0.85}
      >
        {form.isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Play size={18} color="#fff" fill="#fff" />
            <Text style={styles.submitText}>{submitLabel}</Text>
          </>
        )}
      </TouchableOpacity>

      <WatchControlPrompt
        visible={form.showWatchPrompt}
        onSelect={form.handleWatchControlSelect}
        drillName={form.state.name || 'Quick Practice'}
      />
    </ScrollView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  // Header
  header: {
    paddingTop: 30,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
  },

  // Section
  section: { marginBottom: 20 },
  optionGroup: { gap: 10 },

  // Name input
  nameInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Watch hint
  watchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  watchHintContent: { flex: 1 },
  watchHintTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  watchHintSub: { fontSize: 11 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  submitText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2, color: '#fff' },
});
