/**
 * WeaponSetupStep - Multiple weapon addition for team creation
 * 
 * Commander can add multiple team weapons during team creation (optional/skippable).
 */

import { WEAPON_CATEGORIES, getCategoryConfig } from '@/constants/weaponCategories';
import { useColors } from '@/hooks/ui/useColors';
import type { InitialTeamWeapon } from '@/hooks/team/useCreateTeamForm';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import Animated, { FadeInDown, FadeOut, Layout } from 'react-native-reanimated';

export interface WeaponSetupStepProps {
  weapons: InitialTeamWeapon[];
  onAddWeapon: () => void;
  onUpdateWeapon: (id: string, updates: Partial<Omit<InitialTeamWeapon, 'id'>>) => void;
  onRemoveWeapon: (id: string) => void;
  disabled?: boolean;
}

export function WeaponSetupStep({ 
  weapons,
  onAddWeapon,
  onUpdateWeapon,
  onRemoveWeapon,
  disabled = false,
}: WeaponSetupStepProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Skip hint */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <View style={[styles.skipHint, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.skipHintText, { color: colors.textMuted }]}>
            Optional — skip to add weapons later from team settings
          </Text>
        </View>
      </Animated.View>

      {/* Weapons List */}
      {weapons.map((weapon, index) => (
        <WeaponCard
          key={weapon.id}
          weapon={weapon}
          index={index}
          onUpdate={(updates) => onUpdateWeapon(weapon.id, updates)}
          onRemove={() => onRemoveWeapon(weapon.id)}
          disabled={disabled}
          colors={colors}
        />
      ))}

      {/* Add Weapon Button */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)}>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={onAddWeapon}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <View style={[styles.addIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.addButtonText, { color: colors.text }]}>
            {weapons.length === 0 ? 'Add your first weapon' : 'Add another weapon'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Summary */}
      {weapons.length > 0 && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.summary}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>
            {weapons.filter(w => w.name.trim()).length} weapon{weapons.filter(w => w.name.trim()).length !== 1 ? 's' : ''} will be added
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

interface WeaponCardProps {
  weapon: InitialTeamWeapon;
  index: number;
  onUpdate: (updates: Partial<Omit<InitialTeamWeapon, 'id'>>) => void;
  onRemove: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useColors>;
}

function WeaponCard({ weapon, index, onUpdate, onRemove, disabled, colors }: WeaponCardProps) {
  return (
    <Animated.View 
      entering={FadeInDown.duration(300).delay(index * 50)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header with remove button */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Weapon {index + 1}
        </Text>
        <TouchableOpacity
          onPress={onRemove}
          disabled={disabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* Weapon Name Input */}
      <View style={styles.field}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Name</Text>
        <View
          style={[
            styles.inputWrapper,
            { 
              backgroundColor: colors.background, 
              borderColor: weapon.name ? colors.primary : colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. M4A1, Team Rifle, SR-25..."
            placeholderTextColor={colors.textMuted}
            value={weapon.name}
            onChangeText={(name) => onUpdate({ name })}
            returnKeyType="next"
            autoCapitalize="words"
            editable={!disabled}
          />
        </View>
      </View>

      {/* Category Selection */}
      <View style={styles.field}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Category</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {WEAPON_CATEGORIES.map((cat) => {
            const config = getCategoryConfig(cat.value);
            const isSelected = weapon.category === cat.value;
            
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onUpdate({ category: cat.value });
                }}
                activeOpacity={0.7}
                disabled={disabled}
              >
                <Ionicons 
                  name={config?.icon as any || 'ellipse-outline'} 
                  size={14} 
                  color={isSelected ? '#fff' : colors.text} 
                />
                <Text 
                  style={[
                    styles.categoryText, 
                    { color: isSelected ? '#fff' : colors.text }
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Caliber Input (Optional) */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Caliber</Text>
          <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>optional</Text>
        </View>
        <View
          style={[
            styles.inputWrapper,
            { 
              backgroundColor: colors.background, 
              borderColor: weapon.caliber ? colors.primary : colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. 5.56x45, 7.62x51, 9mm..."
            placeholderTextColor={colors.textMuted}
            value={weapon.caliber || ''}
            onChangeText={(caliber) => onUpdate({ caliber: caliber || null })}
            returnKeyType="done"
            autoCapitalize="none"
            editable={!disabled}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  skipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  skipHintText: {
    flex: 1,
    fontSize: 13,
  },
  weaponCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionalLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  inputWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
  },
  categoryScroll: {
    gap: 6,
    paddingRight: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  summary: {
    alignItems: 'center',
    paddingTop: 4,
  },
  summaryText: {
    fontSize: 13,
  },
});
