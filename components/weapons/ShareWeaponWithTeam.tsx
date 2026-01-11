/**
 * ShareWeaponWithTeam - User offers to share personal weapon with a team
 * 
 * Flow:
 * 1. User selects their personal weapon
 * 2. User selects which team to share with
 * 3. Request goes to commander for approval
 */

import { useColors } from '@/hooks/ui/useColors';
import {
  getCategoryLabel,
  getMySharedWeapons,
  getUserWeapons,
  shareWeaponWithTeam,
  withdrawSharedWeapon,
  type UserWeapon,
} from '@/services/weaponService';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Share2,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface ShareWeaponWithTeamProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ShareWeaponWithTeam({
  teamId,
  teamName,
  onClose,
  onSuccess,
}: ShareWeaponWithTeamProps) {
  const colors = useColors();
  
  const [loading, setLoading] = useState(true);
  const [myWeapons, setMyWeapons] = useState<UserWeapon[]>([]);
  const [sharedWeapons, setSharedWeapons] = useState<UserWeapon[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load user's personal weapons
  useEffect(() => {
    loadWeapons();
  }, []);

  const loadWeapons = async () => {
    try {
      setLoading(true);
      const [weapons, shared] = await Promise.all([
        getUserWeapons(),
        getMySharedWeapons(),
      ]);
      
      // Filter out weapons that are already shared with this team
      const sharedWithThisTeam = new Set(
        shared.filter(w => w.shared_with_team_id === teamId).map(w => w.id)
      );
      
      setMyWeapons(weapons.filter(w => 
        !w.team_weapon_id && // Not already from a team
        !sharedWithThisTeam.has(w.id) // Not already shared with this team
      ));
      setSharedWeapons(shared.filter(w => w.shared_with_team_id === teamId));
    } catch (err) {
      console.error('Failed to load weapons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = useCallback(async (weaponId: string) => {
    try {
      setActionLoading(weaponId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await shareWeaponWithTeam(weaponId, teamId);
      await loadWeapons();
      onSuccess?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share weapon');
    } finally {
      setActionLoading(null);
    }
  }, [teamId, onSuccess]);

  const handleWithdraw = useCallback(async (weaponId: string) => {
    try {
      setActionLoading(weaponId);
      await withdrawSharedWeapon(weaponId);
      await loadWeapons();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to withdraw');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderWeaponItem = ({ item }: { item: UserWeapon }) => {
    const isLoading = actionLoading === item.id;
    
    return (
      <View style={[styles.weaponCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.weaponInfo}>
          <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
            {getCategoryLabel(item.category)} {item.caliber && `• ${item.caliber}`}
          </Text>
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleShare(item.id)}
          >
            <Share2 size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSharedItem = ({ item }: { item: UserWeapon }) => {
    const isLoading = actionLoading === item.id;
    const isPending = item.share_status === 'pending';
    const isApproved = item.share_status === 'approved';
    
    return (
      <View style={[styles.sharedCard, { 
        backgroundColor: colors.card, 
        borderColor: isApproved ? colors.green : colors.yellow 
      }]}>
        <View style={styles.statusBadge}>
          {isPending ? (
            <>
              <Clock size={14} color={colors.yellow} />
              <Text style={[styles.statusText, { color: colors.yellow }]}>Pending</Text>
            </>
          ) : (
            <>
              <Check size={14} color={colors.green} />
              <Text style={[styles.statusText, { color: colors.green }]}>Approved</Text>
            </>
          )}
        </View>
        
        <View style={styles.weaponInfo}>
          <Text style={[styles.weaponName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.weaponMeta, { color: colors.textMuted }]}>
            {getCategoryLabel(item.category)} {item.caliber && `• ${item.caliber}`}
          </Text>
        </View>
        
        {isPending && !isLoading && (
          <TouchableOpacity
            style={[styles.withdrawBtn, { backgroundColor: colors.red }]}
            onPress={() => handleWithdraw(item.id)}
          >
            <X size={16} color={colors.destructive} />
          </TouchableOpacity>
        )}
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Weapon</Text>
          <View style={styles.teamBadge}>
            <ArrowRight size={12} color={colors.textMuted} />
            <Text style={[styles.teamName, { color: colors.textMuted }]}>{teamName}</Text>
          </View>
        </View>
        <View style={{ width: 20 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[
            ...(sharedWeapons.length > 0 ? [{ type: 'header', title: 'Already Shared' }] : []),
            ...sharedWeapons.map(w => ({ type: 'shared', data: w })),
            { type: 'header', title: 'My Weapons' },
            ...myWeapons.map(w => ({ type: 'weapon', data: w })),
          ]}
          keyExtractor={(item, index) => 
            item.type === 'header' ? `header-${index}` : (item as { data: UserWeapon }).data.id
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    {(item as { title: string }).title}
                  </Text>
                </View>
              );
            }
            if (item.type === 'shared') {
                  return renderSharedItem({ item: (item as { data: UserWeapon }).data });
            }
            return renderWeaponItem({ item: (item as { data: UserWeapon }).data });
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <AlertTriangle size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No personal weapons to share
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Create a weapon first in "My Weapons"
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamName: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weaponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sharedCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  withdrawBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
  },
});

