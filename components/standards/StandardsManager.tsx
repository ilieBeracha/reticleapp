/**
 * StandardsManager
 *
 * Commander UI for managing team performance standards and condition modifiers.
 * This is where doctrine is defined.
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  deleteModifier,
  deleteStandard,
  getTeamModifiers,
  getTeamStandards,
  type StandardModifier,
  type TeamStandard,
} from '@/services/standards/standardsService';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  CloudRain,
  Crosshair,
  Edit2,
  Heart,
  Plus,
  Target,
  Thermometer,
  Trash2,
  Wind,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AddModifierModal } from './AddModifierModal';
import { AddStandardModal } from './AddStandardModal';

// ============================================================================
// TYPES
// ============================================================================

interface StandardsManagerProps {
  teamId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getModifierIcon(type: string) {
  switch (type) {
    case 'weather_rain':
      return CloudRain;
    case 'weather_wind':
      return Wind;
    case 'weather_cold':
    case 'weather_hot':
      return Thermometer;
    case 'fatigue_shots':
    case 'fatigue_time':
      return Clock;
    case 'fatigue_hr':
      return Heart;
    default:
      return Zap;
  }
}

function formatModifierThreshold(type: string, threshold: Record<string, any>): string {
  switch (type) {
    case 'weather_rain':
      return 'When raining';
    case 'weather_wind':
      return `Wind > ${threshold.wind_kmh_gt || 15} km/h`;
    case 'weather_cold':
      return `Temp < ${threshold.temp_c_lt || 5}°C`;
    case 'weather_hot':
      return `Temp > ${threshold.temp_c_gt || 35}°C`;
    case 'fatigue_shots':
      return `After ${threshold.shots_gt || 50} shots`;
    case 'fatigue_time':
      return `After ${threshold.duration_minutes_gt || 30} min`;
    case 'fatigue_hr':
      return `HR > ${threshold.hr_bpm_gt || 140} BPM`;
    default:
      return 'Custom condition';
  }
}

// ============================================================================
// STANDARD ROW
// ============================================================================

function StandardRow({
  standard,
  colors,
  onEdit,
  onDelete,
}: {
  standard: TeamStandard;
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = standard.drill_goal === 'grouping' ? Target : Crosshair;

  const expectedValue =
    standard.drill_goal === 'grouping' ? `${standard.expected_grouping_cm}cm` : `${standard.expected_accuracy_pct}%`;

  return (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + '20' }]}>
        <Icon size={20} color={colors.primary} />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{standard.name}</Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          {standard.distance_m}m • {standard.drill_goal} • Expected: {expectedValue}
          {standard.weapon_category && ` • ${standard.weapon_category}`}
        </Text>
      </View>

      <View style={styles.rowActions}>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Edit2 size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Trash2 size={18} color={colors.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// MODIFIER ROW
// ============================================================================

function ModifierRow({
  modifier,
  colors,
  onEdit,
  onDelete,
}: {
  modifier: StandardModifier;
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = getModifierIcon(modifier.condition_type);

  const penaltyParts: string[] = [];
  if (modifier.grouping_penalty_cm > 0) {
    penaltyParts.push(`+${modifier.grouping_penalty_cm}cm grouping`);
  }
  if (modifier.accuracy_penalty_pct > 0) {
    penaltyParts.push(`-${modifier.accuracy_penalty_pct}% accuracy`);
  }
  if (modifier.time_penalty_seconds > 0) {
    penaltyParts.push(`+${modifier.time_penalty_seconds}s time`);
  }

  const penaltyText = penaltyParts.length > 0 ? penaltyParts.join(', ') : 'No adjustment';

  return (
    <View style={[styles.row, { backgroundColor: colors.card }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.orange + '20' }]}>
        <Icon size={20} color={colors.orange} />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{modifier.name}</Text>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          {formatModifierThreshold(modifier.condition_type, modifier.condition_threshold)}
        </Text>
        <Text style={[styles.rowPenalty, { color: colors.orange }]}>{penaltyText}</Text>
      </View>

      <View style={styles.rowActions}>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Edit2 size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Trash2 size={18} color={colors.red} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({
  title,
  count,
  onAdd,
  colors,
}: {
  title: string;
  count: number;
  onAdd: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{count}</Text>
      </View>
      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary + '20' }]} onPress={onAdd}>
        <Plus size={16} color={colors.primary} />
        <Text style={[styles.addButtonText, { color: colors.primary }]}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message, colors }: { message: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.empty, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StandardsManager({ teamId }: StandardsManagerProps) {
  const colors = useColors();

  // State
  const [standards, setStandards] = useState<TeamStandard[]>([]);
  const [modifiers, setModifiers] = useState<StandardModifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddStandard, setShowAddStandard] = useState(false);
  const [showAddModifier, setShowAddModifier] = useState(false);
  const [editingStandard, setEditingStandard] = useState<TeamStandard | null>(null);
  const [editingModifier, setEditingModifier] = useState<StandardModifier | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [standardsData, modifiersData] = await Promise.all([getTeamStandards(teamId), getTeamModifiers(teamId)]);
      setStandards(standardsData);
      setModifiers(modifiersData);
    } catch (error) {
      console.error('[StandardsManager] Failed to load:', error);
      Alert.alert('Error', 'Failed to load standards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Delete handlers
  const handleDeleteStandard = useCallback(
    (standard: TeamStandard) => {
      Alert.alert('Delete Standard', `Are you sure you want to delete "${standard.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStandard(standard.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete standard');
            }
          },
        },
      ]);
    },
    [loadData]
  );

  const handleDeleteModifier = useCallback(
    (modifier: StandardModifier) => {
      Alert.alert('Delete Modifier', `Are you sure you want to delete "${modifier.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModifier(modifier.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete modifier');
            }
          },
        },
      ]);
    },
    [loadData]
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
          />
        }
      >
        {/* Info Banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.bannerText, { color: colors.primary }]}>
            Standards define what soldiers should achieve. Modifiers adjust expectations for conditions like weather or
            fatigue.
          </Text>
        </View>

        {/* Base Standards Section */}
        <SectionHeader
          title="Base Standards"
          count={standards.length}
          onAdd={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setEditingStandard(null);
            setShowAddStandard(true);
          }}
          colors={colors}
        />

        {standards.length === 0 ? (
          <EmptyState
            message="No standards defined yet. Add your first standard to start tracking performance."
            colors={colors}
          />
        ) : (
          <View style={styles.list}>
            {standards.map((standard) => (
              <StandardRow
                key={standard.id}
                standard={standard}
                colors={colors}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditingStandard(standard);
                  setShowAddStandard(true);
                }}
                onDelete={() => handleDeleteStandard(standard)}
              />
            ))}
          </View>
        )}

        {/* Condition Modifiers Section */}
        <SectionHeader
          title="Condition Modifiers"
          count={modifiers.length}
          onAdd={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setEditingModifier(null);
            setShowAddModifier(true);
          }}
          colors={colors}
        />

        {modifiers.length === 0 ? (
          <EmptyState
            message="No modifiers defined. Add modifiers to adjust standards for weather, fatigue, etc."
            colors={colors}
          />
        ) : (
          <View style={styles.list}>
            {modifiers.map((modifier) => (
              <ModifierRow
                key={modifier.id}
                modifier={modifier}
                colors={colors}
                onEdit={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditingModifier(modifier);
                  setShowAddModifier(true);
                }}
                onDelete={() => handleDeleteModifier(modifier)}
              />
            ))}
          </View>
        )}

        {/* Spacing at bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <AddStandardModal
        visible={showAddStandard}
        teamId={teamId}
        editingStandard={editingStandard}
        onClose={() => {
          setShowAddStandard(false);
          setEditingStandard(null);
        }}
        onSave={() => {
          setShowAddStandard(false);
          setEditingStandard(null);
          loadData();
        }}
      />

      <AddModifierModal
        visible={showAddModifier}
        teamId={teamId}
        editingModifier={editingModifier}
        onClose={() => {
          setShowAddModifier(false);
          setEditingModifier(null);
        }}
        onSave={() => {
          setShowAddModifier(false);
          setEditingModifier(null);
          loadData();
        }}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Banner
  banner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // List
  list: {
    gap: 8,
    marginBottom: 24,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 12,
  },
  rowPenalty: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 12,
  },

  // Empty
  empty: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
