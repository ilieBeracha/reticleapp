/**
 * CreateWeaponFlow - Guided weapon creation
 * 
 * Flow:
 * 1. Ask: "Is this based on a known weapon?"
 * 2. If yes → Search catalog → Customize name/notes
 * 3. If no → Full custom form (marked as unverified)
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
    AlertTriangle,
    ArrowRight,
    Check,
    ChevronLeft,
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
  teamId?: string; // If provided, creating team weapon instead
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

  // Load all weapons on mount
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

  // Search handler
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

  // Handle base weapon selection
  const handleSelectBase = useCallback((weapon: GlobalWeapon) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBase(weapon);
    setName(`My ${weapon.name}`);
    setCategory(weapon.category);
    setCaliber(weapon.caliber || '');
    setStep('customize');
  }, []);

  // Submit weapon
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
  // RENDER: Step 1 - Choice
  // ─────────────────────────────────────────────────────────────────────────
  
  if (step === 'choice') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Add Weapon" onClose={onCancel} colors={colors} />
        
        <View style={styles.content}>
          <Text style={[styles.question, { color: colors.text }]}>
            Is this based on a known weapon?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Linking to a standard weapon helps with comparisons and analytics.
          </Text>

          <View style={styles.choiceCards}>
            <TouchableOpacity
              style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep('search');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.choiceIcon, { backgroundColor: colors.text }]}>
                <Search size={20} color={colors.background} />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: colors.text }]}>
                  Yes, pick from catalog
                </Text>
                <Text style={[styles.choiceDesc, { color: colors.textMuted }]}>
                  Search M40, SR-25, Tikka, etc.
                </Text>
              </View>
              <ArrowRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep('custom');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.choiceIcon, { backgroundColor: colors.secondary }]}>
                <Plus size={20} color={colors.text} />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: colors.text }]}>
                  No, create custom
                </Text>
                <Text style={[styles.choiceDesc, { color: colors.textMuted }]}>
                  For rare or custom weapons
                </Text>
              </View>
              <ArrowRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 2a - Search Catalog
  // ─────────────────────────────────────────────────────────────────────────
  
  if (step === 'search') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header 
          title="Select Base Weapon" 
          onClose={onCancel} 
          onBack={() => setStep('choice')}
          colors={colors} 
        />
        
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search weapons..."
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
              activeOpacity={0.7}
            >
              <View style={styles.weaponInfo}>
                <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
                  {item.manufacturer} • {item.caliber}
                </Text>
              </View>
              {item.is_verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: `${colors.green}20` }]}>
                  <Check size={12} color={colors.green} />
                </View>
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
  // RENDER: Step 2b - Custom Weapon Form
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
          {/* Warning */}
          <View style={[styles.warningBox, { backgroundColor: `${colors.orange}15` }]}>
            <AlertTriangle size={16} color={colors.orange} />
            <Text style={[styles.warningText, { color: colors.orange }]}>
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
                    style={[
                      styles.categoryText,
                      { color: category === cat.value ? colors.background : colors.text },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
              <>
                <Text style={[styles.submitText, { color: colors.background }]}>Create Weapon</Text>
                <Check size={18} color={colors.background} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Step 3 - Customize (after selecting base)
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
        {/* Selected base */}
        {selectedBase && (
          <View style={[styles.selectedBase, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.verifiedBadge, { backgroundColor: `${colors.green}20` }]}>
              <Check size={12} color={colors.green} />
            </View>
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
            placeholder="e.g., Zero confirmed 12/15, suppressor adds +2 MOA..."
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
            <>
              <Text style={[styles.submitText, { color: colors.background }]}>Add Weapon</Text>
              <Check size={18} color={colors.background} />
            </>
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
  content: {
    flex: 1,
    padding: 20,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  choiceCards: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  weaponMeta: {
    fontSize: 13,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  warningText: {
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
    fontSize: 15,
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
    height: 50,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

