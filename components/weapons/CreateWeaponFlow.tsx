/**
 * CreateWeaponFlow - Guided weapon creation
 * 
 * Design: Clean, monochrome, Apple-inspired
 * - Typography-first
 * - Minimal color usage
 * - Generous whitespace
 */

import { useColors } from '@/hooks/ui/useColors';
import {
    createUserWeapon,
    getGlobalWeapons,
    searchGlobalWeapons,
    WEAPON_CATEGORIES,
    type GlobalWeapon,
    type WeaponCategory,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
    AlertCircle,
    Check,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
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

type FlowStep = 'choice' | 'search' | 'customize' | 'custom';

interface CreateWeaponFlowProps {
  onComplete: (weaponId: string) => void;
  onCancel: () => void;
  teamId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateWeaponFlow({ onComplete, onCancel, teamId }: CreateWeaponFlowProps) {
  const colors = useColors();
  
  const [step, setStep] = useState<FlowStep>('choice');
  const [selectedBase, setSelectedBase] = useState<GlobalWeapon | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalWeapon[]>([]);
  const [allWeapons, setAllWeapons] = useState<GlobalWeapon[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WeaponCategory>('precision_rifle');
  const [caliber, setCaliber] = useState('');
  const [notes, setNotes] = useState('');
  const [zeroDistance, setZeroDistance] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeapons();
  }, []);

  const loadWeapons = async () => {
    try {
      const weapons = await getGlobalWeapons();
      setAllWeapons(weapons);
      setSearchResults(weapons);
    } catch (err) {
      console.error('Failed to load weapons:', err);
    }
  };

  useEffect(() => {
    if (step !== 'search') return;
    
    const timer = setTimeout(async () => {
      if (searchQuery.trim()) {
        setSearching(true);
        try {
          const results = await searchGlobalWeapons(searchQuery);
          setSearchResults(results);
        } catch (err) {
          console.error('Search failed:', err);
        }
        setSearching(false);
      } else {
        setSearchResults(allWeapons);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, step, allWeapons]);

  const handleSelectBase = useCallback((weapon: GlobalWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBase(weapon);
    setName(`My ${weapon.name}`);
    setCategory(weapon.category);
    setCaliber(weapon.caliber || '');
    setStep('customize');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const weapon = await createUserWeapon({
        name: name.trim(),
        base_weapon_id: selectedBase?.id,
        category,
        caliber: caliber.trim() || undefined,
        personal_zero_distance_m: zeroDistance ? parseInt(zeroDistance, 10) : undefined,
        personal_notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete(weapon.id);
    } catch (err: any) {
      console.error('Failed to create weapon:', err);
      setError(err.message || 'Failed to create weapon');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  }, [name, selectedBase, category, caliber, zeroDistance, notes, onComplete]);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Choice
  // ─────────────────────────────────────────────────────────────────────────
  
  if (step === 'choice') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.choiceHeader}>
          <TouchableOpacity 
            style={[styles.closeBtn, { backgroundColor: colors.secondary }]} 
            onPress={onCancel}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.headline, { color: colors.text }]}>
            Add a weapon
          </Text>

          <View style={styles.choiceList}>
            {/* From Catalog - Primary */}
            <TouchableOpacity
              style={[styles.choiceRow, { backgroundColor: colors.text }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep('search');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: colors.background + '15' }]}>
                <Search size={16} color={colors.background} />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: colors.background }]}>
                  From Catalog
                </Text>
                <Text style={[styles.choiceDesc, { color: colors.background + 'AA' }]}>
                  M40, SR-25, Tikka, and more
                </Text>
              </View>
              <ChevronRight size={16} color={colors.background + '60'} />
            </TouchableOpacity>

            {/* Custom - Secondary */}
            <TouchableOpacity
              style={[styles.choiceRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep('custom');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.choiceIconWrap, { backgroundColor: colors.secondary }]}>
                <Plus size={16} color={colors.textMuted} />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: colors.text }]}>
                  Create Custom
                </Text>
                <Text style={[styles.choiceDesc, { color: colors.textMuted }]}>
                  For rare or modified weapons
                </Text>
              </View>
              <ChevronRight size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2a: Search Catalog
  // ─────────────────────────────────────────────────────────────────────────
  
  if (step === 'search') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header 
          title="Select Base" 
          onClose={onCancel} 
          onBack={() => setStep('choice')}
          colors={colors} 
        />
        
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color={colors.textMuted} />}
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.weaponRow, { borderBottomColor: colors.border }]}
              onPress={() => handleSelectBase(item)}
              activeOpacity={0.6}
            >
              <View style={styles.weaponInfo}>
                <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
                  {item.manufacturer} • {item.caliber}
                </Text>
              </View>
              {item.is_verified && (
                <Check size={16} color={colors.text} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery ? 'No weapons found' : 'Loading...'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2b: Custom Weapon Form
  // ─────────────────────────────────────────────────────────────────────────
  
  if (step === 'custom') {
    return (
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header 
          title="Custom Weapon" 
          onClose={onCancel} 
          onBack={() => setStep('choice')}
          colors={colors} 
        />

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
            <AlertCircle size={16} color={colors.textMuted} />
            <Text style={[styles.noticeText, { color: colors.textMuted }]}>
              Custom weapons won't appear in standard comparisons
            </Text>
          </View>

          <FormField label="Name" required colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., My Custom Rifle"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </FormField>

          <FormField label="Category" colors={colors}>
            <View style={styles.categoryPicker}>
              {WEAPON_CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isSelected ? colors.text : colors.card },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategory(cat.value);
                    }}
                  >
                    <Text style={[
                      styles.categoryText,
                      { color: isSelected ? colors.background : colors.text }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>

          <FormField label="Caliber" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., .308 Winchester"
              placeholderTextColor={colors.textMuted}
              value={caliber}
              onChangeText={setCaliber}
            />
          </FormField>

          <FormField label="Zero Distance (m)" colors={colors}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., 100"
              placeholderTextColor={colors.textMuted}
              value={zeroDistance}
              onChangeText={setZeroDistance}
              keyboardType="number-pad"
            />
          </FormField>

          <FormField label="Notes" colors={colors}>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Optional notes..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </FormField>

          {error && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: name.trim() ? colors.text : colors.secondary }]}
            onPress={handleSubmit}
            disabled={!name.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.submitText, { color: colors.background }]}>
                Create Weapon
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Customize (after selecting base)
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header 
        title="Customize" 
        onClose={onCancel} 
        onBack={() => {
          setSelectedBase(null);
          setStep('search');
        }}
        colors={colors} 
      />

      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        {selectedBase && (
          <View style={[styles.selectedBase, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Check size={16} color={colors.text} />
            <View style={styles.selectedBaseInfo}>
              <Text style={[styles.selectedBaseName, { color: colors.text }]}>{selectedBase.name}</Text>
              <Text style={[styles.selectedBaseMeta, { color: colors.textMuted }]}>
                {selectedBase.manufacturer} • {selectedBase.caliber}
              </Text>
            </View>
          </View>
        )}

        <FormField label="Your name for this weapon" required colors={colors}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., My M40 - Suppressed"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </FormField>

        <FormField label="Zero Distance (m)" colors={colors}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g., 100"
            placeholderTextColor={colors.textMuted}
            value={zeroDistance}
            onChangeText={setZeroDistance}
            keyboardType="number-pad"
          />
        </FormField>

        <FormField label="Personal Notes" colors={colors}>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Zero confirmed date, suppressor notes..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </FormField>

        {error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: name.trim() ? colors.text : colors.secondary }]}
          onPress={handleSubmit}
          disabled={!name.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.submitText, { color: colors.background }]}>
              Add Weapon
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Header({ 
  title, 
  onClose, 
  onBack,
  colors 
}: { 
  title: string; 
  onClose: () => void; 
  onBack?: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      {onBack ? (
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
        <X size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function FormField({ 
  label, 
  required, 
  children, 
  colors 
}: { 
  label: string; 
  required?: boolean;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
        {label}
        {required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      {children}
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
  choiceHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 24,
  },
  choiceList: {
    gap: 8,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  choiceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 1,
  },
  choiceDesc: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 17,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  weaponInfo: {
    flex: 1,
  },
  weaponName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  weaponMeta: {
    fontSize: 13,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 20,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  textArea: {
    height: 88,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedBase: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  selectedBaseInfo: {
    flex: 1,
  },
  selectedBaseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedBaseMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
