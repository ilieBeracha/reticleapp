/**
 * RequestWeaponModal - Soldier requests a weapon from commander
 *
 * Features:
 * - Friendly guided flow
 * - Category preference selector (chips)
 * - Optional notes field
 * - Clear "what happens next" guidance
 */

import { useColors } from '@/hooks/ui/useColors';
import { createWeaponRequest, WEAPON_CATEGORIES, type WeaponCategory } from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { ArrowRight, CheckCircle2, Clock, Send, Shield, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Animated, { FadeInDown } from 'react-native-reanimated';

interface RequestWeaponModalProps {
  visible: boolean;
  teamId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestWeaponModal({ visible, teamId, onClose, onSuccess }: RequestWeaponModalProps) {
  const colors = useColors();

  const [selectedCategory, setSelectedCategory] = useState<WeaponCategory | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await createWeaponRequest({
        team_id: teamId,
        weapon_category: selectedCategory || undefined,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to submit request:', err);
      Alert.alert('Request Failed', err.message || 'Could not submit weapon request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} disabled={submitting}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Request Weapon</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(100)}
            style={[styles.heroSection, { backgroundColor: colors.card }]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + '15' }]}>
              <Shield size={28} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Get Ready for Training</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Request a weapon assignment from your commander to start participating in drills.
            </Text>
          </Animated.View>

          {/* What Happens Next */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.stepsContainer}>
            <Text style={[styles.stepsTitle, { color: colors.textMuted }]}>WHAT HAPPENS NEXT</Text>
            <View style={styles.stepsList}>
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Send size={14} color={colors.primary} />
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>Your request is sent to the commander</Text>
              </View>
              <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.yellow + '15' }]}>
                  <Clock size={14} color={colors.yellow} />
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>Commander reviews and assigns a weapon</Text>
              </View>
              <View style={[styles.stepConnector, { backgroundColor: colors.border }]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, { backgroundColor: colors.green + '15' }]}>
                  <CheckCircle2 size={14} color={colors.green} />
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>You're ready to start training!</Text>
              </View>
            </View>
          </Animated.View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PREFERRED CATEGORY (OPTIONAL)</Text>
            <View style={styles.categoryGrid}>
              {WEAPON_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(isSelected ? null : cat.value);
                    }}
                    disabled={submitting}
                  >
                    <Text style={[styles.categoryLabel, { color: isSelected ? '#fff' : colors.text }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ADDITIONAL NOTES (OPTIONAL)</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Any specific requirements or preferences..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!submitting}
            />
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>Send Request</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    gap: 24,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 12,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 12,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  stepsList: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  stepConnector: {
    width: 2,
    height: 12,
    marginLeft: 13,
    borderRadius: 1,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 100,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
