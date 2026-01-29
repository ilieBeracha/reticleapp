/**
 * DrillCreator - Unified drill creation and configuration
 *
 * Two modes:
 * 1. Start from library drill → Modify → Add/Save
 * 2. Start from scratch → Configure → Add/Save
 */

import { RANGE_CATEGORIES, type RangeCategory } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { getCategoryLabel, WEAPON_CATEGORIES } from '@/services/weaponService';
import type { Drill, DrillGoal, WeaponCategory } from '@/types/workspace';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Check,
  Clock,
  Crosshair,
  Layers,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DrillConfig, TrainingDrillItem } from '@/types/createTraining';

// ============================================================================
// TYPES
// ============================================================================

interface DrillCreatorProps {
  visible: boolean;
  teamDrills: Drill[];
  canSaveToLibrary: boolean;
  onAddToTraining: (drill: TrainingDrillItem) => void;
  onSaveAndAdd: (drillData: DrillSaveData, config: DrillConfig) => Promise<void>;
  onClose: () => void;
}

interface DrillSaveData {
  name: string;
  drill_goal: DrillGoal;
  target_type: 'paper' | 'tactical';
  distance_m: number;
  rounds_per_shooter: number;
  time_limit_seconds?: number;
  strings_count?: number;
}

type CreatorStep = 'select' | 'configure';

// ============================================================================
// CONSTANTS
// ============================================================================

const GOAL_COLORS: Record<string, string> = {
  grouping: '#10B981',
  engagement: '#F59E0B',
};

const DISTANCE_PRESETS = [25, 50, 100, 200, 300];
const SHOTS_PRESETS = [3, 5, 10, 15, 20];
const TIME_PRESETS: (number | null)[] = [null, 30, 60, 90, 120];
const STRINGS_PRESETS = [1, 2, 3, 5];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DrillCreator({
  visible,
  teamDrills,
  canSaveToLibrary,
  onAddToTraining,
  onSaveAndAdd,
  onClose,
}: DrillCreatorProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Step state
  const [step, setStep] = useState<CreatorStep>('select');
  const [baseDrill, setBaseDrill] = useState<Drill | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | DrillGoal>('all');

  // Config state
  const [name, setName] = useState('');
  const [drillGoal, setDrillGoal] = useState<DrillGoal>('grouping');
  const [targetType, setTargetType] = useState<'paper' | 'tactical'>('paper');
  const [distance, setDistance] = useState(100);
  const [shots, setShots] = useState(5);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [strings, setStrings] = useState(1);
  const [weaponCategory, setWeaponCategory] = useState<WeaponCategory | null>(null);
  const [customDistance, setCustomDistance] = useState('');
  const [customShots, setCustomShots] = useState('');
  const [distanceCategory, setDistanceCategory] = useState<RangeCategory | null>(null);

  // Save state
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep('select');
      setBaseDrill(null);
      setSearchQuery('');
      setActiveFilter('all');
      resetConfig();
    }
  }, [visible]);

  const resetConfig = () => {
    setName('');
    setDrillGoal('grouping');
    setTargetType('paper');
    setDistance(100);
    setShots(5);
    setTimeLimit(null);
    setStrings(1);
    setWeaponCategory(null);
    setCustomDistance('');
    setCustomShots('');
    setDistanceCategory(null);
    setSaveToLibrary(false);
  };

  // Apply base drill values
  const applyBaseDrill = (drill: Drill) => {
    setBaseDrill(drill);
    setName(drill.name);
    setDrillGoal(drill.drill_goal);
    setTargetType(drill.target_type);
    setDistance(drill.distance_m);
    setShots(drill.rounds_per_shooter);
    setTimeLimit(drill.time_limit_seconds || null);
    setStrings(drill.strings_count || 1);
    setWeaponCategory(drill.weapon_category || null);
    setDistanceCategory(null);
    setStep('configure');
  };

  const startFromScratch = () => {
    setBaseDrill(null);
    resetConfig();
    setStep('configure');
  };

  // Filter drills (handle both 'engagement' filter and legacy 'achievement' DB values)
  const filteredDrills = teamDrills.filter((drill) => {
    if (activeFilter === 'engagement' && drill.drill_goal !== 'engagement') return false;
    if (activeFilter === 'grouping' && drill.drill_goal !== 'grouping') return false;
    if (searchQuery) {
      return drill.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const counts = {
    all: teamDrills.length,
    grouping: teamDrills.filter((d) => d.drill_goal === 'grouping').length,
    engagement: teamDrills.filter((d) => d.drill_goal === 'engagement').length,
  };

  // Handle add/save
  const handleConfirm = useCallback(async () => {
    const inputMethod = drillGoal === 'grouping' ? 'scan' : 'manual';

    const config: DrillConfig = {
      distance_m: distanceCategory ? 0 : distance,
      distance_category: distanceCategory,
      rounds_per_shooter: shots,
      time_limit_seconds: timeLimit,
      strings_count: strings,
      weapon_category: weaponCategory,
      input_method: inputMethod,
    };

    if (saveToLibrary && canSaveToLibrary) {
      setSaving(true);
      try {
        await onSaveAndAdd(
          {
            name: name.trim() || 'New Drill',
            drill_goal: drillGoal,
            target_type: targetType,
            distance_m: distanceCategory ? 0 : distance,
            rounds_per_shooter: shots,
            time_limit_seconds: timeLimit || undefined,
            strings_count: strings,
          },
          config
        );
        onClose();
      } finally {
        setSaving(false);
      }
    } else {
      // Just add to training without saving to library
      const drill: TrainingDrillItem = {
        id: Date.now().toString(),
        drill_id: baseDrill?.id, // undefined if no baseDrill
        name: name.trim() || baseDrill?.name || 'Quick Drill',
        drill_goal: drillGoal,
        target_type: targetType,
        description: undefined,
        input_method: inputMethod,
        distance_m: distanceCategory ? 0 : distance,
        distance_category: distanceCategory,
        rounds_per_shooter: shots,
        time_limit_seconds: timeLimit || undefined,
        strings_count: strings,
        weapon_category: weaponCategory || undefined,
      };

      onAddToTraining(drill);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
  }, [
    name,
    drillGoal,
    targetType,
    distance,
    distanceCategory,
    shots,
    timeLimit,
    strings,
    weaponCategory,
    saveToLibrary,
    baseDrill,
    canSaveToLibrary,
    onAddToTraining,
    onSaveAndAdd,
    onClose,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {step === 'select' ? 'Add Drill' : 'Configure Drill'}
          </Text>
          {step === 'configure' ? (
            <TouchableOpacity style={styles.headerBtn} onPress={handleConfirm} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Check size={20} color={colors.text} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {step === 'select' ? (
          <SelectStep
            drills={filteredDrills}
            counts={counts}
            searchQuery={searchQuery}
            activeFilter={activeFilter}
            onSearchChange={setSearchQuery}
            onFilterChange={setActiveFilter}
            onSelectDrill={applyBaseDrill}
            onStartFromScratch={startFromScratch}
            colors={colors}
          />
        ) : (
          <ConfigureStep
            name={name}
            drillGoal={drillGoal}
            targetType={targetType}
            distance={distance}
            distanceCategory={distanceCategory}
            shots={shots}
            timeLimit={timeLimit}
            strings={strings}
            weaponCategory={weaponCategory}
            customDistance={customDistance}
            customShots={customShots}
            saveToLibrary={saveToLibrary}
            canSaveToLibrary={canSaveToLibrary}
            baseDrill={baseDrill}
            onNameChange={setName}
            onDrillGoalChange={setDrillGoal}
            onTargetTypeChange={setTargetType}
            onDistanceChange={setDistance}
            onDistanceCategoryChange={setDistanceCategory}
            onShotsChange={setShots}
            onTimeLimitChange={setTimeLimit}
            onStringsChange={setStrings}
            onWeaponCategoryChange={setWeaponCategory}
            onCustomDistanceChange={(text) => {
              setCustomDistance(text);
              const num = parseInt(text, 10);
              if (!isNaN(num) && num > 0) setDistance(num);
            }}
            onCustomShotsChange={(text) => {
              setCustomShots(text);
              const num = parseInt(text, 10);
              if (!isNaN(num) && num > 0) setShots(num);
            }}
            onSaveToLibraryChange={setSaveToLibrary}
            onBack={() => setStep('select')}
            onConfirm={handleConfirm}
            saving={saving}
            colors={colors}
            insets={insets}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// SELECT STEP
// ============================================================================

function SelectStep({
  drills,
  counts,
  searchQuery,
  activeFilter,
  onSearchChange,
  onFilterChange,
  onSelectDrill,
  onStartFromScratch,
  colors,
}: {
  drills: Drill[];
  counts: { all: number; grouping: number; engagement: number };
  searchQuery: string;
  activeFilter: 'all' | DrillGoal;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: 'all' | DrillGoal) => void;
  onSelectDrill: (d: Drill) => void;
  onStartFromScratch: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.selectContainer}>
      {/* Start from Scratch */}
      <TouchableOpacity
        style={[styles.scratchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onStartFromScratch();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.scratchIcon, { backgroundColor: colors.text }]}>
          <Sparkles size={18} color={colors.background} />
        </View>
        <View style={styles.scratchContent}>
          <Text style={[styles.scratchTitle, { color: colors.text }]}>Start from Scratch</Text>
          <Text style={[styles.scratchSubtitle, { color: colors.textMuted }]}>Create a completely new drill</Text>
        </View>
        <ArrowRight size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or modify existing</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search drills..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <X size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'grouping', 'engagement'] as const).map((filter) => {
          const isActive = activeFilter === filter;
          const color =
            filter === 'grouping'
              ? GOAL_COLORS.grouping
              : filter === 'engagement'
                ? GOAL_COLORS.engagement
                : colors.text;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: isActive ? `${color}15` : 'transparent',
                  borderColor: isActive ? color : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onFilterChange(filter);
              }}
            >
              <Text style={[styles.filterText, { color: isActive ? color : colors.textMuted }]}>
                {filter === 'all' ? 'All' : filter === 'grouping' ? 'Grouping' : 'Achievement'} ({counts[filter]})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Drill List */}
      <FlatList
        data={drills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.drillList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const goalColor = GOAL_COLORS[item.drill_goal];
          return (
            <TouchableOpacity
              style={[styles.drillCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectDrill(item);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.drillIndicator, { backgroundColor: goalColor }]} />
              <View style={styles.drillContent}>
                <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
                  {item.icon ? `${item.icon} ` : ''}
                  {item.name}
                </Text>
                <View style={styles.drillMeta}>
                  <View style={[styles.metaTag, { backgroundColor: colors.secondary }]}>
                    <MapPin size={10} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.distance_m}m</Text>
                  </View>
                  <View style={[styles.metaTag, { backgroundColor: colors.secondary }]}>
                    <Target size={10} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.rounds_per_shooter}</Text>
                  </View>
                  {item.time_limit_seconds && (
                    <View style={[styles.metaTag, { backgroundColor: colors.secondary }]}>
                      <Clock size={10} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.time_limit_seconds}s</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={[styles.useBtn, { borderColor: goalColor }]}>
                <ArrowRight size={14} color={goalColor} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {drills.length === 0 ? 'No drills in library yet' : 'No matching drills'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ============================================================================
// CONFIGURE STEP
// ============================================================================

function ConfigureStep({
  name,
  drillGoal,
  targetType,
  distance,
  distanceCategory,
  shots,
  timeLimit,
  strings,
  weaponCategory,
  customDistance,
  customShots,
  saveToLibrary,
  canSaveToLibrary,
  baseDrill,
  onNameChange,
  onDrillGoalChange,
  onTargetTypeChange,
  onDistanceChange,
  onDistanceCategoryChange,
  onShotsChange,
  onTimeLimitChange,
  onStringsChange,
  onWeaponCategoryChange,
  onCustomDistanceChange,
  onCustomShotsChange,
  onSaveToLibraryChange,
  onBack,
  onConfirm,
  saving,
  colors,
  insets,
}: {
  name: string;
  drillGoal: DrillGoal;
  targetType: 'paper' | 'tactical';
  distance: number;
  distanceCategory: RangeCategory | null;
  shots: number;
  timeLimit: number | null;
  strings: number;
  weaponCategory: WeaponCategory | null;
  customDistance: string;
  customShots: string;
  saveToLibrary: boolean;
  canSaveToLibrary: boolean;
  baseDrill: Drill | null;
  onNameChange: (n: string) => void;
  onDrillGoalChange: (g: DrillGoal) => void;
  onTargetTypeChange: (t: 'paper' | 'tactical') => void;
  onDistanceChange: (d: number) => void;
  onDistanceCategoryChange: (c: RangeCategory | null) => void;
  onShotsChange: (s: number) => void;
  onTimeLimitChange: (t: number | null) => void;
  onStringsChange: (s: number) => void;
  onWeaponCategoryChange: (c: WeaponCategory | null) => void;
  onCustomDistanceChange: (t: string) => void;
  onCustomShotsChange: (t: string) => void;
  onSaveToLibraryChange: (s: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  saving: boolean;
  colors: ReturnType<typeof useColors>;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  const goalColor = GOAL_COLORS[drillGoal];
  const totalShots = shots * strings;
  const inputMethod = drillGoal === 'grouping' ? '📷 Scan' : '✋ Manual';

  return (
    <>
      <ScrollView style={styles.configScroll} contentContainerStyle={styles.configContent}>
        {/* Back Link */}
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Ionicons name="chevron-back" size={16} color={colors.text} />
          <Text style={[styles.backLinkText, { color: colors.text }]}>Library</Text>
        </TouchableOpacity>

        {/* Base Drill Indicator */}
        {baseDrill && (
          <View style={[styles.baseIndicator, { backgroundColor: `${goalColor}15`, borderColor: goalColor }]}>
            <Text style={[styles.baseText, { color: goalColor }]}>Based on: {baseDrill.name}</Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Drill Name</Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={baseDrill?.name || 'New Drill'}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={onNameChange}
          />
        </View>

        {/* Drill Goal */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal</Text>
          <View style={styles.goalRow}>
            {(['grouping', 'engagement'] as DrillGoal[]).map((goal) => {
              const isSelected = drillGoal === goal || (goal === 'engagement' && drillGoal === 'engagement');
              const color = GOAL_COLORS[goal];
              return (
                <TouchableOpacity
                  key={goal}
                  style={[
                    styles.goalBtn,
                    {
                      backgroundColor: isSelected ? color : 'transparent',
                      borderColor: isSelected ? color : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDrillGoalChange(goal);
                    if (goal === 'grouping') onTargetTypeChange('paper');
                  }}
                >
                  {goal === 'grouping' ? (
                    <Crosshair size={14} color={isSelected ? colors.accentForeground : color} />
                  ) : (
                    <Target size={14} color={isSelected ? colors.accentForeground : color} />
                  )}
                  <Text style={[styles.goalText, { color: isSelected ? colors.accentForeground : colors.text }]}>
                    {goal === 'grouping' ? 'Grouping' : 'Achievement'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Target Type (only for engagement) */}
        {drillGoal === 'engagement' && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Target Type</Text>
            <View style={styles.chipRow}>
              {(['paper', 'tactical'] as const).map((type) => {
                const isSelected = targetType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? colors.text : 'transparent',
                        borderColor: isSelected ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      onTargetTypeChange(type);
                    }}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? colors.background : colors.text }]}>
                      {type === 'paper' ? 'Paper' : 'Tactical'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Distance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Distance</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>
              {distanceCategory
                ? `${distanceCategory === 'short' ? 'Short (0-300m)' : distanceCategory === 'medium' ? 'Medium (300-600m)' : 'Long (600m+)'}`
                : `${distance}m`}
            </Text>
          </View>
          {/* Row 1: Mode toggle */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: !distanceCategory ? colors.text : 'transparent',
                  borderColor: !distanceCategory ? colors.text : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onDistanceCategoryChange(null);
              }}
            >
              <Text style={[styles.chipText, { color: !distanceCategory ? colors.background : colors.text }]}>
                Exact
              </Text>
            </TouchableOpacity>
            {RANGE_CATEGORIES.map((cat) => {
              const isSelected = distanceCategory === cat.value;
              const desc = cat.max ? `${cat.min}-${cat.max}m` : `${cat.min}m+`;
              const label = cat.value === 'short' ? 'Short' : cat.value === 'medium' ? 'Medium' : 'Long';
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.text : 'transparent',
                      borderColor: isSelected ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDistanceCategoryChange(cat.value);
                    onCustomDistanceChange('');
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? colors.background : colors.text }]}>
                    {label} ({desc})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Row 2: Exact presets (only when Exact mode) */}
          {!distanceCategory && (
            <View style={styles.chipRow}>
              {DISTANCE_PRESETS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: distance === val && !customDistance ? colors.text : 'transparent',
                      borderColor: distance === val && !customDistance ? colors.text : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDistanceChange(val);
                    onDistanceCategoryChange(null);
                    onCustomDistanceChange('');
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: distance === val && !customDistance ? colors.background : colors.text },
                    ]}
                  >
                    {val}m
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: customDistance ? colors.text : colors.card,
                    borderColor: customDistance ? colors.text : colors.border,
                    color: customDistance ? colors.background : colors.text,
                  },
                ]}
                placeholder="..."
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={customDistance}
                onChangeText={onCustomDistanceChange}
              />
            </View>
          )}
          {distanceCategory && (
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
              Soldier picks exact distance within this range
            </Text>
          )}
        </View>

        {/* Shots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={14} color={colors.textMuted} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Shots per round</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{shots}</Text>
          </View>
          <View style={styles.chipRow}>
            {SHOTS_PRESETS.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  {
                    backgroundColor: shots === val && !customShots ? colors.text : 'transparent',
                    borderColor: shots === val && !customShots ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onShotsChange(val);
                  onCustomShotsChange('');
                }}
              >
                <Text
                  style={[styles.chipText, { color: shots === val && !customShots ? colors.background : colors.text }]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: customShots ? colors.text : colors.card,
                  borderColor: customShots ? colors.text : colors.border,
                  color: customShots ? colors.background : colors.text,
                },
              ]}
              placeholder="..."
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={customShots}
              onChangeText={onCustomShotsChange}
            />
          </View>
        </View>

        {/* Strings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Layers size={14} color={colors.textMuted} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Strings</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{strings}x</Text>
          </View>
          <View style={styles.chipRow}>
            {STRINGS_PRESETS.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  {
                    backgroundColor: strings === val ? colors.text : 'transparent',
                    borderColor: strings === val ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onStringsChange(val);
                }}
              >
                <Text style={[styles.chipText, { color: strings === val ? colors.background : colors.text }]}>
                  {val}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Limit */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Time Limit</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{timeLimit ? `${timeLimit}s` : 'None'}</Text>
          </View>
          <View style={styles.chipRow}>
            {TIME_PRESETS.map((val, i) => (
              <TouchableOpacity
                key={val ?? 'none'}
                style={[
                  styles.chip,
                  {
                    backgroundColor: timeLimit === val ? colors.text : 'transparent',
                    borderColor: timeLimit === val ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onTimeLimitChange(val);
                }}
              >
                <Text style={[styles.chipText, { color: timeLimit === val ? colors.background : colors.text }]}>
                  {val ? `${val}s` : 'None'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weapon Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Crosshair size={14} color={colors.textMuted} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Weapon Category</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Filter which weapons can be used</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: weaponCategory === null ? colors.text : 'transparent',
                  borderColor: weaponCategory === null ? colors.text : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onWeaponCategoryChange(null);
              }}
            >
              <Text style={[styles.chipText, { color: weaponCategory === null ? colors.background : colors.text }]}>
                Any
              </Text>
            </TouchableOpacity>
            {WEAPON_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: weaponCategory === cat.value ? colors.text : 'transparent',
                    borderColor: weaponCategory === cat.value ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  onWeaponCategoryChange(cat.value);
                }}
              >
                <Text
                  style={[styles.chipText, { color: weaponCategory === cat.value ? colors.background : colors.text }]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.textMuted }]}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total shots:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{totalShots}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Input method:</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{inputMethod}</Text>
          </View>
          {weaponCategory && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Weapon:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{getCategoryLabel(weaponCategory)}</Text>
            </View>
          )}
        </View>

        {/* Save to Library Option */}
        {canSaveToLibrary && (
          <TouchableOpacity
            style={[styles.saveToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              Haptics.selectionAsync();
              onSaveToLibraryChange(!saveToLibrary);
            }}
          >
            <View style={[styles.saveIcon, { backgroundColor: saveToLibrary ? colors.text : colors.secondary }]}>
              <Plus size={14} color={saveToLibrary ? colors.background : colors.textMuted} />
            </View>
            <View style={styles.saveContent}>
              <Text style={[styles.saveTitle, { color: colors.text }]}>Save to Library</Text>
              <Text style={[styles.saveDesc, { color: colors.textMuted }]}>
                Add this drill to your team's collection
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: saveToLibrary ? colors.text : colors.border,
                  backgroundColor: saveToLibrary ? colors.text : 'transparent',
                },
              ]}
            >
              {saveToLibrary && <Check size={12} color={colors.background} strokeWidth={3} />}
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.text }]}
          onPress={onConfirm}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Text style={[styles.addBtnText, { color: colors.background }]}>
                {saveToLibrary ? 'Save & Add to Training' : 'Add to Training'}
              </Text>
              <Check size={18} color={colors.background} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Select Step
  selectContainer: {
    flex: 1,
    padding: 16,
  },
  scratchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  scratchIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchContent: {
    flex: 1,
  },
  scratchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  scratchSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  drillList: {
    gap: 8,
    paddingBottom: 20,
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  drillIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  drillContent: {
    flex: 1,
  },
  drillName: {
    fontSize: 14,
    fontWeight: '600',
  },
  drillMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
  },
  useBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  // Configure Step
  configScroll: {
    flex: 1,
  },
  configContent: {
    padding: 16,
    gap: 20,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  baseIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  baseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: -6,
  },
  nameInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  goalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  customInput: {
    width: 50,
    height: 34,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  summary: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  saveIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveContent: {
    flex: 1,
  },
  saveTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
