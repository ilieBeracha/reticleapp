/**
 * SessionFormSheet - Solo session creation form
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
    Crosshair,
    Hand,
    Play,
    Trophy,
    Watch,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { GOAL_COLORS } from './FormComponents';
import {
    DISTANCE_PRESETS,
    ROUNDS_PRESETS,
    SHOTS_PRESETS,
    TIME_PRESETS,
    type UseSessionFormReturn
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
  submitLabel = 'Start',
  showNameInput = false,
}: SessionFormSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const accentColor = GOAL_COLORS[form.state.drillGoal];
  
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
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Name Input */}
      {showNameInput && (
        <TextInput
          style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Session name..."
          placeholderTextColor={colors.textMuted}
          value={form.state.name}
          onChangeText={form.setName}
        />
      )}

      {/* Mode Selection */}
      <View style={styles.modeSection}>
        {/* Objective */}
        <View style={styles.modeGroup}>
          <Text style={[styles.modeLabel, { color: colors.textMuted }]}>OBJECTIVE</Text>
          <View style={styles.toggleRow}>
            <ToggleButton
              icon={<Crosshair size={16} color={form.state.drillGoal === 'grouping' ? GOAL_COLORS.grouping : colors.textMuted} />}
              label="Grouping"
              active={form.state.drillGoal === 'grouping'}
              color={GOAL_COLORS.grouping}
              onPress={() => form.setDrillGoal('grouping')}
            />
            <ToggleButton
              icon={<Trophy size={16} color={form.state.drillGoal === 'achievement' ? GOAL_COLORS.achievement : colors.textMuted} />}
              label="Achievement"
              active={form.state.drillGoal === 'achievement'}
              color={GOAL_COLORS.achievement}
              onPress={() => form.setDrillGoal('achievement')}
            />
          </View>
        </View>

        {/* Input Method */}
        <View style={styles.modeGroup}>
          <Text style={[styles.modeLabel, { color: colors.textMuted }]}>INPUT</Text>
          <View style={styles.toggleRow}>
            <ToggleButton
              icon={<Camera size={16} color={form.state.inputMethod === 'scan' ? accentColor : colors.textMuted} />}
              label="Scan"
              active={form.state.inputMethod === 'scan'}
              color={accentColor}
              onPress={() => form.setInputMethod('scan')}
            />
            <ToggleButton
              icon={<Hand size={16} color={form.state.inputMethod === 'manual' ? accentColor : colors.textMuted} />}
              label="Manual"
              active={form.state.inputMethod === 'manual'}
              color={accentColor}
              onPress={() => form.setInputMethod('manual')}
            />
          </View>
        </View>
      </View>

      {/* Scan + Grouping hint */}
      {isMinimalMode && (
        <View style={[styles.hintBox, { backgroundColor: `${accentColor}10` }]}>
          <Camera size={14} color={accentColor} />
          <Text style={[styles.hintText, { color: accentColor }]}>
            AI will detect shots from scanned target
          </Text>
        </View>
      )}

      {/* Configuration */}
      <View style={[styles.configSection, { borderColor: colors.border }]}>
        {/* Distance - always shown */}
        <ConfigRow
          label="Distance"
          unit="m"
          value={form.state.distance}
          onChange={form.setDistance}
          presets={DISTANCE_PRESETS}
          accentColor={accentColor}
        />

        {/* Shots - hidden for grouping+scan */}
        {!isMinimalMode && (
          <ConfigRow
            label="Shots"
            unit="per target"
            value={form.state.shots}
            onChange={form.setShots}
            presets={SHOTS_PRESETS}
            accentColor={accentColor}
          />
        )}

        {/* Rounds - hidden for grouping+scan */}
        {!isMinimalMode && (
          <ConfigRow
            label="Rounds"
            unit="×"
            value={form.state.rounds}
            onChange={form.setRounds}
            presets={ROUNDS_PRESETS}
            accentColor={accentColor}
          />
        )}

        {/* Time - always shown */}
        <TimeRow
          value={form.state.timeLimit}
          onChange={form.setTimeLimit}
          presets={TIME_PRESETS}
          accentColor={accentColor}
        />
      </View>

      {/* Watch hint */}
      {form.isWatchConnected && (
        <View style={[styles.watchHint, { borderColor: form.canUseWatch ? '#10B981' : colors.border }]}>
          <Watch size={16} color={form.canUseWatch ? '#10B981' : colors.textMuted} />
          <Text style={[styles.watchHintText, { color: form.canUseWatch ? '#10B981' : colors.textMuted }]}>
            {form.canUseWatch 
              ? 'Watch connected — choose control after' 
              : 'Watch unavailable with scan mode'}
          </Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: accentColor, marginBottom: insets.bottom + 16 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); form.submit(); }}
        disabled={form.isSubmitting}
        activeOpacity={0.8}
      >
        {form.isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Play size={20} color="#fff" fill="#fff" />
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
// TOGGLE BUTTON
// ============================================================================

function ToggleButton({ 
  icon, 
  label, 
  active, 
  color, 
  onPress 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  color: string; 
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.toggleBtn,
        { 
          backgroundColor: active ? `${color}15` : colors.card,
          borderColor: active ? color : colors.border,
        },
      ]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[styles.toggleLabel, { color: active ? color : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// CONFIG ROW (inline input + presets)
// ============================================================================

function ConfigRow({
  label,
  unit,
  value,
  onChange,
  presets,
  accentColor,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  presets: number[];
  accentColor: string;
}) {
  const colors = useColors();
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  const handleBlur = () => {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < 1) { onChange(1); setText('1'); }
    else { onChange(n); }
  };

  return (
    <View style={[styles.configRow, { borderBottomColor: colors.border }]}>
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
      <View style={styles.configRight}>
        <View style={[styles.inputBox, { borderColor: accentColor }]}>
          <TextInput
            style={[styles.inputText, { color: colors.text }]}
            value={text}
            onChangeText={setText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
        {presets.slice(0, 4).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.presetPill, { backgroundColor: value === p ? accentColor : colors.secondary }]}
            onPress={() => { Haptics.selectionAsync(); onChange(p); }}
          >
            <Text style={[styles.presetText, { color: value === p ? '#fff' : colors.textMuted }]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// TIME ROW (with input + None toggle)
// ============================================================================

function TimeRow({
  value,
  onChange,
  presets,
  accentColor,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  presets: (number | null)[];
  accentColor: string;
}) {
  const colors = useColors();
  const [text, setText] = useState(value ? String(value) : '');
  const hasValue = value !== null;

  useEffect(() => { setText(value ? String(value) : ''); }, [value]);

  const handleTextChange = (t: string) => {
    setText(t);
    if (t === '') {
      onChange(null);
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n > 0) onChange(n);
    }
  };

  const handleBlur = () => {
    if (text === '' || text === '0') {
      onChange(null);
      setText('');
    }
  };

  // Filter presets to only show numbers (not null) for quick selection
  const numberPresets = presets.filter((p): p is number => p !== null);

  return (
    <View style={styles.configRow}>
      <View style={styles.configLeft}>
        <Text style={[styles.configLabel, { color: colors.text }]}>Time</Text>
        <Text style={[styles.configUnit, { color: colors.textMuted }]}>seconds</Text>
      </View>
      <View style={styles.configRight}>
        {/* None toggle */}
        <TouchableOpacity
          style={[styles.presetPill, { backgroundColor: !hasValue ? accentColor : colors.secondary }]}
          onPress={() => { Haptics.selectionAsync(); onChange(null); setText(''); }}
        >
          <Text style={[styles.presetText, { color: !hasValue ? '#fff' : colors.textMuted }]}>None</Text>
        </TouchableOpacity>

        {/* Input box */}
        <View style={[styles.inputBox, { borderColor: hasValue ? accentColor : colors.border }]}>
          <TextInput
            style={[styles.inputText, { color: colors.text }]}
            value={text}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
        </View>

        {/* Quick presets */}
        {numberPresets.slice(0, 3).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.presetPill, { backgroundColor: value === p ? accentColor : colors.secondary }]}
            onPress={() => { Haptics.selectionAsync(); onChange(p); }}
          >
            <Text style={[styles.presetText, { color: value === p ? '#fff' : colors.textMuted }]}>{p}s</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  header: { paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  nameInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },

  // Mode selection (column layout)
  modeSection: { flexDirection: 'column', gap: 16, marginBottom: 16 },
  modeGroup: {},
  modeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  toggleLabel: { fontSize: 12, fontWeight: '600' },

  // Hint
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintText: { fontSize: 12, fontWeight: '500' },

  // Config
  configSection: {
    borderTopWidth: 1,
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  configLeft: { flexDirection: 'column', gap: 2 },
  configLabel: { fontSize: 15, fontWeight: '600' },
  configUnit: { fontSize: 11 },
  configRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputBox: {
    width: 44,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  inputText: { fontSize: 14, fontWeight: '700', textAlign: 'center', padding: 0 },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  presetText: { fontSize: 12, fontWeight: '600' },

  // Watch
  watchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  watchHintText: { fontSize: 12, fontWeight: '500', flex: 1 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
