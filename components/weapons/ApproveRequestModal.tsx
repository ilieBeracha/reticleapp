/**
 * ApproveRequestModal - Commander approves/rejects weapon requests
 *
 * Features:
 * - Request summary (user, preference, notes)
 * - Weapon selection list (filtered by category)
 * - Approve or Reject actions
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  approveWeaponRequest,
  getCategoryLabel,
  rejectWeaponRequest,
  type TeamWeapon,
  type WeaponRequest,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import { Check, MessageSquare, User, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ApproveRequestModalProps {
  visible: boolean;
  request: WeaponRequest | null;
  availableWeapons: TeamWeapon[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveRequestModal({
  visible,
  request,
  availableWeapons,
  onClose,
  onSuccess,
}: ApproveRequestModalProps) {
  const colors = useColors();

  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);

  // Filter weapons by category preference if specified
  const filteredWeapons = request?.weapon_category
    ? availableWeapons.filter((w) => w.category === request.weapon_category)
    : availableWeapons;

  // If filter results in no weapons, show all unassigned
  const weaponsToShow = filteredWeapons.length > 0 ? filteredWeapons : availableWeapons;

  const handleApprove = async () => {
    if (!request || !selectedWeaponId) {
      Alert.alert('Select Weapon', 'Please select a weapon to assign.');
      return;
    }

    try {
      setActionLoading('approve');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await approveWeaponRequest(request.id, selectedWeaponId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      Alert.alert('Error', err.message || 'Could not approve request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!request) return;

    try {
      setActionLoading('reject');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await rejectWeaponRequest(request.id, rejectNotes.trim() || undefined);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      Alert.alert('Error', err.message || 'Could not reject request. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = () => {
    setSelectedWeaponId(null);
    setRejectNotes('');
    setShowRejectForm(false);
    onClose();
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} disabled={actionLoading !== null}>
            <X size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Review Request</Text>
          <View style={{ width: 22 }} />
        </View>

        {showRejectForm ? (
          // Reject Form
          <View style={styles.rejectForm}>
            <Text style={[styles.rejectTitle, { color: colors.text }]}>
              Reject Request
            </Text>
            <Text style={[styles.rejectSubtitle, { color: colors.textMuted }]}>
              Optionally provide a reason for rejection
            </Text>

            <TextInput
              style={[
                styles.rejectInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor={colors.textMuted}
              value={rejectNotes}
              onChangeText={setRejectNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={actionLoading !== 'reject'}
            />

            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowRejectForm(false)}
                disabled={actionLoading !== null}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmRejectBtn, { backgroundColor: colors.destructive }]}
                onPress={handleReject}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'reject' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmRejectText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Request Summary */}
            <View style={[styles.requestSummary, { backgroundColor: colors.card }]}>
              <View style={styles.summaryRow}>
                <User size={16} color={colors.textMuted} />
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Requested by
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {request.user?.full_name || 'Unknown'}
                </Text>
              </View>

              {request.weapon_category && (
                <View style={styles.summaryRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                      {getCategoryLabel(request.weapon_category)}
                    </Text>
                  </View>
                  <Text style={[styles.preferenceLabel, { color: colors.textMuted }]}>
                    preferred
                  </Text>
                </View>
              )}

              {request.notes && (
                <View style={styles.notesRow}>
                  <MessageSquare size={14} color={colors.textMuted} />
                  <Text style={[styles.notesText, { color: colors.text }]}>
                    "{request.notes}"
                  </Text>
                </View>
              )}
            </View>

            {/* Weapon Selection */}
            <View style={styles.weaponSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                SELECT WEAPON TO ASSIGN
                {request.weapon_category && filteredWeapons.length > 0 && (
                  <Text> (filtered by preference)</Text>
                )}
              </Text>

              <FlatList
                data={weaponsToShow}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedWeaponId === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.weaponCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedWeaponId(item.id);
                      }}
                      disabled={actionLoading !== null}
                    >
                      <View style={styles.weaponInfo}>
                        <Text style={[styles.weaponName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
                          {getCategoryLabel(item.category)}
                          {item.caliber && ` \u2022 ${item.caliber}`}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.weaponList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      No unassigned weapons available
                    </Text>
                    <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                      Add more team weapons first
                    </Text>
                  </View>
                }
              />
            </View>

            {/* Action Buttons */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.rejectBtn, { backgroundColor: colors.destructive + '15' }]}
                onPress={() => setShowRejectForm(true)}
                disabled={actionLoading !== null}
              >
                <X size={18} color={colors.destructive} />
                <Text style={[styles.rejectBtnText, { color: colors.destructive }]}>
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.approveBtn,
                  { backgroundColor: colors.green },
                  (!selectedWeaponId || weaponsToShow.length === 0) && styles.approveDisabled,
                ]}
                onPress={handleApprove}
                disabled={!selectedWeaponId || actionLoading !== null || weaponsToShow.length === 0}
              >
                {actionLoading === 'approve' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve & Assign</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
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
  requestSummary: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  preferenceLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 20,
  },
  weaponSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  weaponList: {
    gap: 8,
    paddingBottom: 16,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  weaponInfo: {
    flex: 1,
    gap: 2,
  },
  weaponName: {
    fontSize: 15,
    fontWeight: '600',
  },
  weaponMeta: {
    fontSize: 13,
  },
  checkCircle: {
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
    fontSize: 15,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  approveDisabled: {
    opacity: 0.5,
  },
  approveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Reject Form
  rejectForm: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  rejectTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  rejectSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  rejectInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 100,
  },
  rejectActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmRejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmRejectText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
