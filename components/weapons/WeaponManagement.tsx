/**
 * WeaponManagement - List, edit, delete weapons
 *
 * Shows all user weapons with:
 * - Favorites first
 * - Last used indicator
 * - Edit/delete actions
 * - Add new button
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  deleteUserWeapon,
  getCategoryLabel,
  getUserWeapons,
  toggleUserWeaponFavorite,
  updateUserWeapon,
  WEAPON_CATEGORIES,
  type UserWeapon,
  type WeaponCategory,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { Check, ChevronLeft, Edit3, Plus, Star, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// ============================================================================
// TYPES
// ============================================================================

interface WeaponManagementProps {
  onAddNew: () => void;
  onClose: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WeaponManagement({ onAddNew, onClose }: WeaponManagementProps) {
  const colors = useColors();

  const [loading, setLoading] = useState(true);
  const [weapons, setWeapons] = useState<UserWeapon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingWeapon, setEditingWeapon] = useState<UserWeapon | null>(null);

  useEffect(() => {
    loadWeapons();
  }, []);

  const loadWeapons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserWeapons();
      setWeapons(data);
    } catch (err: any) {
      console.error('Failed to load weapons:', err);
      setError(err.message || 'Failed to load weapons');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = useCallback(async (weapon: UserWeapon) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await toggleUserWeaponFavorite(weapon.id);
      await loadWeapons();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update favorite');
    }
  }, []);

  const handleDelete = useCallback((weapon: UserWeapon) => {
    Alert.alert('Delete Weapon', `Are you sure you want to delete "${weapon.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUserWeapon(weapon.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadWeapons();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete weapon');
          }
        },
      },
    ]);
  }, []);

  const handleEditSave = useCallback(
    async (updates: Partial<UserWeapon>) => {
      if (!editingWeapon) return;

      try {
        await updateUserWeapon(editingWeapon.id, updates);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setEditingWeapon(null);
        await loadWeapons();
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to update weapon');
      }
    },
    [editingWeapon]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Weapons</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Add New */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAddNew();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.addIcon, { backgroundColor: colors.text }]}>
          <Plus size={16} color={colors.background} />
        </View>
        <Text style={[styles.addText, { color: colors.text }]}>Add New Weapon</Text>
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : error ? (
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          <TouchableOpacity onPress={loadWeapons}>
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : weapons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No weapons yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Add your first weapon to get started</Text>
        </View>
      ) : (
        <FlatList
          data={weapons}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WeaponRow
              weapon={item}
              onEdit={() => setEditingWeapon(item)}
              onDelete={() => handleDelete(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={editingWeapon !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingWeapon(null)}
      >
        {editingWeapon && (
          <EditWeaponForm weapon={editingWeapon} onSave={handleEditSave} onCancel={() => setEditingWeapon(null)} />
        )}
      </Modal>
    </View>
  );
}

// ============================================================================
// WEAPON ROW
// ============================================================================

function WeaponRow({
  weapon,
  onEdit,
  onDelete,
  onToggleFavorite,
  colors,
}: {
  weapon: UserWeapon;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const lastUsed = weapon.last_used_at ? formatRelativeTime(new Date(weapon.last_used_at)) : null;

  return (
    <View style={[styles.weaponRow, { borderBottomColor: colors.border }]}>
      {/* Favorite */}
      <TouchableOpacity style={styles.favoriteBtn} onPress={onToggleFavorite}>
        <Star
          size={18}
          color={weapon.is_favorite ? colors.orange : colors.textMuted}
          fill={weapon.is_favorite ? colors.orange : 'transparent'}
        />
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.weaponInfo}>
        <Text style={[styles.weaponName, { color: colors.text }]} numberOfLines={1}>
          {weapon.name}
        </Text>
        <View style={styles.weaponMeta}>
          <Text style={[styles.weaponCategory, { color: colors.textMuted }]}>{getCategoryLabel(weapon.category)}</Text>
          {weapon.caliber && (
            <Text style={[styles.weaponCaliber, { color: colors.textMuted }]}>• {weapon.caliber}</Text>
          )}
          {lastUsed && <Text style={[styles.weaponLastUsed, { color: colors.textMuted }]}>• {lastUsed}</Text>}
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
        <Edit3 size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
        <Trash2 size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// EDIT FORM
// ============================================================================

function EditWeaponForm({
  weapon,
  onSave,
  onCancel,
}: {
  weapon: UserWeapon;
  onSave: (updates: Partial<UserWeapon>) => void;
  onCancel: () => void;
}) {
  const colors = useColors();

  const [name, setName] = useState(weapon.name);
  const [category, setCategory] = useState<WeaponCategory | null>(weapon.category);
  const [caliber, setCaliber] = useState(weapon.caliber || '');
  const [zeroDistance, setZeroDistance] = useState(weapon.personal_zero_distance_m?.toString() || '');
  const [notes, setNotes] = useState(weapon.personal_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    await onSave({
      name: name.trim(),
      category,
      caliber: caliber.trim() || null,
      personal_zero_distance_m: zeroDistance ? parseInt(zeroDistance, 10) : null,
      personal_notes: notes.trim() || null,
    });
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.editContainer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={onCancel}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={[styles.editHeaderTitle, { color: colors.text }]}>Edit Weapon</Text>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.text} /> : <Check size={20} color={colors.text} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editScroll} contentContainerStyle={styles.editContent}>
        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Weapon name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Category</Text>
          <View style={styles.categoryPicker}>
            {WEAPON_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: category === cat.value ? colors.text : 'transparent',
                    borderColor: category === cat.value ? colors.text : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCategory(cat.value);
                }}
              >
                <Text
                  style={[styles.categoryText, { color: category === cat.value ? colors.background : colors.text }]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Caliber */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Caliber</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={caliber}
            onChangeText={setCaliber}
            placeholder="e.g., .308 Winchester"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Zero Distance */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Zero Distance (m)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            value={zeroDistance}
            onChangeText={setZeroDistance}
            placeholder="e.g., 100"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Notes</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Personal notes..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 15,
    fontWeight: '500',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  favoriteBtn: {
    padding: 4,
  },
  weaponInfo: {
    flex: 1,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '600',
  },
  weaponMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  weaponCategory: {
    fontSize: 13,
  },
  weaponCaliber: {
    fontSize: 13,
    marginLeft: 4,
  },
  weaponLastUsed: {
    fontSize: 13,
    marginLeft: 4,
  },
  actionBtn: {
    padding: 8,
  },
  // Edit Modal
  editContainer: {
    flex: 1,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  editScroll: {
    flex: 1,
  },
  editContent: {
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
