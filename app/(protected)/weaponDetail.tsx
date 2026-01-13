/**
 * Weapon Detail Screen
 *
 * Shows detailed information about a user's weapon including stats,
 * configuration, and recent sessions.
 */

import { getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import {
  deleteUserWeapon,
  getDefaultWeaponId,
  getUserWeapon,
  getWeaponStats,
  setDefaultWeaponId,
  updateUserWeapon,
  type UserWeapon,
  type WeaponStats,
} from '@/services/weaponService';
import type { WeaponCategory } from '@/types/workspace';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Crosshair,
  Edit3,
  Star,
  Target,
  Trash2,
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryIcon(category: WeaponCategory | null, color: string, size = 20) {
  switch (category) {
    case 'precision_rifle':
      return <Crosshair size={size} color={color} />;
    case 'rifle':
    case 'carbine':
      return <Target size={size} color={color} />;
    default:
      return <Zap size={size} color={color} />;
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

interface RecentSession {
  id: string;
  started_at: string;
  status: string;
  drill_name?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WeaponDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { weaponId } = useLocalSearchParams<{ weaponId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weapon, setWeapon] = useState<UserWeapon | null>(null);
  const [stats, setStats] = useState<WeaponStats | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!weaponId) return;

    try {
      const [weaponData, allStats, defaultId] = await Promise.all([
        getUserWeapon(weaponId),
        getWeaponStats(),
        getDefaultWeaponId(),
      ]);

      if (!weaponData) {
        router.back();
        return;
      }

      setWeapon(weaponData);
      setStats(allStats.get(weaponId) || null);
      setIsDefault(defaultId === weaponId);
      setNotes(weaponData.personal_notes || '');

      // Fetch recent sessions for this weapon
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, started_at, status, drill:drills(name)')
        .eq('weapon_id', weaponId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (sessions) {
        setRecentSessions(
          sessions.map((s: any) => ({
            id: s.id,
            started_at: s.started_at,
            status: s.status,
            drill_name: s.drill?.name,
          }))
        );
      }
    } catch (error) {
      console.error('[WeaponDetail] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weaponId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const handleToggleDefault = useCallback(async () => {
    if (!weapon) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newDefault = isDefault ? null : weapon.id;
      await setDefaultWeaponId(newDefault);
      setIsDefault(!isDefault);
      Haptics.notificationAsync(
        newDefault ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error('Failed to toggle default:', error);
    }
  }, [weapon, isDefault]);

  const handleSaveNotes = useCallback(async () => {
    if (!weapon) return;

    try {
      await updateUserWeapon(weapon.id, { personal_notes: notes || null });
      setWeapon({ ...weapon, personal_notes: notes || null });
      setEditingNotes(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  }, [weapon, notes]);

  const handleDelete = useCallback(() => {
    if (!weapon) return;

    Alert.alert(
      'Delete Weapon',
      `Are you sure you want to delete "${weapon.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserWeapon(weapon.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('Failed to delete weapon:', error);
              Alert.alert('Error', 'Failed to delete weapon');
            }
          },
        },
      ]
    );
  }, [weapon]);

  const handleSessionPress = useCallback((sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/sessionDetail',
      params: { sessionId },
    } as any);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!weapon) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.loadingContainer}>
          <Text style={[s.errorText, { color: colors.textMuted }]}>Weapon not found</Text>
        </View>
      </View>
    );
  }

  const categoryConfig = weapon.category ? getCategoryConfig(weapon.category) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {weapon.name}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.headerAction, { backgroundColor: isDefault ? '#f59e0b15' : 'transparent' }]}
          onPress={handleToggleDefault}
          activeOpacity={0.7}
        >
          <Star size={20} color={isDefault ? '#f59e0b' : colors.textMuted} fill={isDefault ? '#f59e0b' : 'none'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero Section */}
        <View style={[s.heroCard, { backgroundColor: colors.card }]}>
          <View style={[s.heroIcon, { backgroundColor: `${colors.primary}15` }]}>
            {getCategoryIcon(weapon.category, colors.primary, 28)}
          </View>
          <View style={s.heroInfo}>
            <Text style={[s.heroName, { color: colors.text }]}>{weapon.name}</Text>
            <Text style={[s.heroMeta, { color: colors.textMuted }]}>
              {categoryConfig?.label || 'Weapon'}
              {weapon.caliber && ` · ${weapon.caliber}`}
            </Text>
          </View>
          {isDefault && (
            <View style={s.defaultBadge}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              <Text style={s.defaultText}>Default</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={[s.statsCard, { backgroundColor: colors.card }]}>
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.text }]}>{stats?.total_sessions ?? 0}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.text }]}>{formatNumber(stats?.total_rounds_fired ?? 0)}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Rounds</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {stats?.avg_accuracy_pct != null ? `${stats.avg_accuracy_pct}%` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Accuracy</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: colors.text }]}>
              {stats?.best_dispersion_cm != null ? `${stats.best_dispersion_cm}cm` : '—'}
            </Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>Best Group</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Details</Text>
          <View style={[s.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Zero Distance */}
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textMuted }]}>Zero Distance</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {weapon.personal_zero_distance_m ? `${weapon.personal_zero_distance_m}m` : 'Not set'}
              </Text>
            </View>
            <View style={[s.detailDivider, { backgroundColor: colors.border }]} />

            {/* Last Used */}
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textMuted }]}>Last Used</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {stats?.last_used_at ? format(new Date(stats.last_used_at), 'MMM d, yyyy') : 'Never'}
              </Text>
            </View>
            <View style={[s.detailDivider, { backgroundColor: colors.border }]} />

            {/* Created */}
            <View style={s.detailRow}>
              <Text style={[s.detailLabel, { color: colors.textMuted }]}>Added</Text>
              <Text style={[s.detailValue, { color: colors.text }]}>
                {format(new Date(weapon.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Notes</Text>
            {!editingNotes && (
              <TouchableOpacity onPress={() => setEditingNotes(true)} activeOpacity={0.7}>
                <Edit3 size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[s.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {editingNotes ? (
              <View style={s.notesEdit}>
                <TextInput
                  style={[s.notesInput, { color: colors.text, borderColor: colors.border }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this weapon..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={s.notesActions}>
                  <TouchableOpacity
                    style={[s.notesCancelBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setNotes(weapon.personal_notes || '');
                      setEditingNotes(false);
                    }}
                  >
                    <Text style={[s.notesCancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.notesSaveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveNotes}
                  >
                    <Text style={s.notesSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={[s.notesText, { color: weapon.personal_notes ? colors.text : colors.textMuted }]}>
                {weapon.personal_notes || 'No notes added'}
              </Text>
            )}
          </View>
        </View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
            <View style={[s.sessionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {recentSessions.map((session, index) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    s.sessionRow,
                    index < recentSessions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSessionPress(session.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.sessionIcon, { backgroundColor: colors.secondary }]}>
                    <Calendar size={14} color={colors.textMuted} />
                  </View>
                  <View style={s.sessionInfo}>
                    <Text style={[s.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                      {session.drill_name || 'Practice Session'}
                    </Text>
                    <Text style={[s.sessionDate, { color: colors.textMuted }]}>
                      {format(new Date(session.started_at), 'MMM d, yyyy · HH:mm')}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.border} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={[s.deleteBtn, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={s.deleteBtnText}>Delete Weapon</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Hero
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroMeta: {
    fontSize: 14,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 10,
  },

  // Details Card
  detailsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    marginLeft: 14,
  },

  // Notes
  notesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  notesEdit: {
    gap: 12,
  },
  notesInput: {
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  notesCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  notesCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  notesSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Sessions
  sessionsCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 11,
  },

  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
