/**
 * SessionContextStep - Step 2: "Under what conditions?"
 * 
 * Content only - parent handles ScrollView and button.
 */

import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Edit3,
  MapPin,
  Target,
  User,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  DISTANCE_PRESETS,
  POSITION_OPTIONS,
  SHOTS_PRESETS,
  TIME_PRESETS,
  getPurposeOption,
} from './sessionCreation.constants';
import type { Position, SessionContextState, SessionPurpose } from './sessionCreation.types';

// ============================================================================
// PROPS
// ============================================================================

interface SessionContextStepProps {
  purpose: SessionPurpose;
  context: SessionContextState;
  onUpdateContext: (partial: Partial<SessionContextState>) => void;
  onBack: () => void;
}

// ============================================================================
// VALUE PICKER WITH CUSTOM INPUT
// ============================================================================

function ValuePickerWithCustom({
  presets,
  value,
  onSelect,
  format,
  suffix,
  min = 1,
  max = 1000,
}: {
  presets: number[];
  value: number;
  onSelect: (value: number) => void;
  format?: (value: number) => string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const [showCustom, setShowCustom] = useState(!presets.includes(value));
  const [customText, setCustomText] = useState(value.toString());

  const getLabel = (v: number) => {
    if (format) return format(v);
    return suffix ? `${v}${suffix}` : String(v);
  };

  const isCustomValue = !presets.includes(value);

  const handlePresetSelect = (preset: number) => {
    Haptics.selectionAsync();
    setShowCustom(false);
    onSelect(preset);
  };

  const handleCustomPress = () => {
    Haptics.selectionAsync();
    setShowCustom(true);
    setCustomText(value.toString());
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCustomChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomText(cleaned);
  };

  const handleCustomSubmit = () => {
    const num = parseInt(customText, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      onSelect(num);
    } else {
      // Reset to current value if invalid
      setCustomText(value.toString());
    }
  };

  return (
    <View style={styles.valuePickerContainer}>
      <View style={styles.valuePickerRow}>
        {presets.map((preset, i) => {
          const isSelected = preset === value && !showCustom;
          return (
            <TouchableOpacity
              key={`${preset}-${i}`}
              style={[
                styles.valueChip,
                {
                  backgroundColor: isSelected ? colors.text : 'transparent',
                  borderColor: isSelected ? colors.text : colors.border,
                },
              ]}
              onPress={() => handlePresetSelect(preset)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.valueChipText,
                  { color: isSelected ? colors.background : colors.text },
                ]}
              >
                {getLabel(preset)}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Custom chip */}
        <TouchableOpacity
          style={[
            styles.valueChip,
            styles.customChip,
            {
              backgroundColor: (showCustom || isCustomValue) ? colors.text : 'transparent',
              borderColor: (showCustom || isCustomValue) ? colors.text : colors.border,
            },
          ]}
          onPress={handleCustomPress}
          activeOpacity={0.7}
        >
          <Edit3 
            size={12} 
            color={(showCustom || isCustomValue) ? colors.background : colors.textMuted} 
            strokeWidth={2}
          />
          <Text
            style={[
              styles.valueChipText,
              { color: (showCustom || isCustomValue) ? colors.background : colors.textMuted },
            ]}
          >
            {isCustomValue && !showCustom ? getLabel(value) : 'Custom'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom input field */}
      {showCustom && (
        <View style={[styles.customInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.customInput, { color: colors.text }]}
            value={customText}
            onChangeText={handleCustomChange}
            onBlur={handleCustomSubmit}
            onSubmitEditing={handleCustomSubmit}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder={`${min}-${max}`}
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
          {suffix && (
            <Text style={[styles.customSuffix, { color: colors.textMuted }]}>{suffix}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// SIMPLE VALUE PICKER (for position, time)
// ============================================================================

function ValuePicker<T extends string | number | null>({
  values,
  selected,
  onSelect,
  format,
}: {
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
  format?: (value: T) => string;
}) {
  const colors = useColors();

  const getLabel = (v: T) => {
    if (format) return format(v);
    if (v === null) return '—';
    return String(v);
  };

  return (
    <View style={styles.valuePickerRow}>
      {values.map((value, i) => {
        const isSelected = value === selected;
        return (
          <TouchableOpacity
            key={`${value}-${i}`}
            style={[
              styles.valueChip,
              {
                backgroundColor: isSelected ? colors.text : 'transparent',
                borderColor: isSelected ? colors.text : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(value);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.valueChipText,
                { color: isSelected ? colors.background : colors.text },
              ]}
            >
              {getLabel(value)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================================
// PARAM ROW
// ============================================================================

function ParamRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const colors = useColors();

  return (
    <View style={styles.paramRow}>
      <View style={styles.paramHeader}>
        {icon}
        <Text style={[styles.paramLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SessionContextStep({
  purpose,
  context,
  onUpdateContext,
  onBack,
}: SessionContextStepProps) {
  const colors = useColors();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const purposeOption = getPurposeOption(purpose);
  const distancePresets = DISTANCE_PRESETS[purpose] || DISTANCE_PRESETS.custom;
  const shotsPresets = SHOTS_PRESETS[purpose] || SHOTS_PRESETS.custom;

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'None';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const formatPosition = (pos: Position) => {
    return POSITION_OPTIONS.find((p) => p.value === pos)?.label || pos;
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={handleBack}
        >
          <ChevronLeft size={18} color={colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Parameters</Text>
          <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
            {purposeOption?.label || 'Session'}
          </Text>
        </View>
      </View>

      {/* Parameters */}
      <View style={styles.paramsContainer}>
        <ParamRow
          icon={<MapPin size={14} color={colors.textMuted} strokeWidth={1.5} />}
          label="Distance"
        >
          <ValuePickerWithCustom
            presets={distancePresets}
            value={context.distance}
            onSelect={(d) => onUpdateContext({ distance: d })}
            suffix="m"
            min={1}
            max={2000}
          />
        </ParamRow>

        <ParamRow
          icon={<Target size={14} color={colors.textMuted} strokeWidth={1.5} />}
          label="Shots"
        >
          <ValuePickerWithCustom
            presets={shotsPresets}
            value={context.shotsPlanned}
            onSelect={(s) => onUpdateContext({ shotsPlanned: s })}
            min={1}
            max={100}
          />
        </ParamRow>

        <ParamRow
          icon={<User size={14} color={colors.textMuted} strokeWidth={1.5} />}
          label="Position"
        >
          <ValuePicker
            values={POSITION_OPTIONS.map((p) => p.value)}
            selected={context.position}
            onSelect={(p) => onUpdateContext({ position: p })}
            format={formatPosition}
          />
        </ParamRow>

        <ParamRow
          icon={<Clock size={14} color={colors.textMuted} strokeWidth={1.5} />}
          label="Time Limit"
        >
          <ValuePicker
            values={TIME_PRESETS}
            selected={context.timeLimit}
            onSelect={(t) => onUpdateContext({ timeLimit: t })}
            format={formatTime}
          />
        </ParamRow>

        {/* Notes Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAdvanced((s) => !s);
          }}
        >
          <Text style={[styles.advancedText, { color: colors.textMuted }]}>Notes</Text>
          {showAdvanced ? (
            <ChevronUp size={14} color={colors.textMuted} />
          ) : (
            <ChevronDown size={14} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        {showAdvanced && (
          <TextInput
            style={[
              styles.notesInput,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Optional notes..."
            placeholderTextColor={colors.textMuted}
            value={context.notes}
            onChangeText={(notes) => onUpdateContext({ notes })}
            multiline
            numberOfLines={3}
          />
        )}
      </View>

      {/* Summary */}
      <View style={[styles.summary, { borderTopColor: colors.border }]}>
        <Text style={[styles.summaryText, { color: colors.textMuted }]}>
          {context.distance}m • {context.shotsPlanned} shots
          {context.position !== 'any' ? ` • ${formatPosition(context.position)}` : ''}
          {context.timeLimit ? ` • ${formatTime(context.timeLimit)}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  paramsContainer: {
    gap: 20,
  },
  paramRow: {
    gap: 10,
  },
  paramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paramLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valuePickerContainer: {
    gap: 8,
  },
  valuePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  customSuffix: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  advancedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  summary: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
