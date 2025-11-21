import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useState, useRef, useEffect } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ProfileOption {
  profile_id: string;
  org_id: string;
  org_name: string;
  org_type: 'personal' | 'organization';
  org_slug: string | null;
  display_name: string | null;
  role: 'owner' | 'admin' | 'instructor' | 'member';
  status: string;
}

interface ProfileSelectorProps {
  profiles: ProfileOption[];
  loading?: boolean;
  onSelectProfile: (profileId: string) => void;
  onCreateOrg?: () => void;
}

export function ProfileSelector({ profiles, loading, onSelectProfile, onCreateOrg }: ProfileSelectorProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const handleSelect = async (profileId: string) => {
    if (isTransitioning) return;
    
    // Immediate haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    setSelectedId(profileId);
    setIsTransitioning(true);
    
    // Dramatic transition sequence
    Animated.sequence([
      // 1. Pulse the selected card
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }),
      // 2. Fade out everything
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(async () => {
      // Heavy impact before transition
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Small delay for dramatic effect
      setTimeout(() => {
        onSelectProfile(profileId);
      }, 100);
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#FFD700'; // Gold
      case 'admin':
        return '#FF6B6B'; // Red
      case 'instructor':
        return '#4ECDC4'; // Teal
      default:
        return colors.textMuted;
    }
  };

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'owner':
        return 'shield-checkmark';
      case 'admin':
        return 'settings';
      case 'instructor':
        return 'school';
      default:
        return 'person';
    }
  };

  const getOrgIcon = (orgType: string): keyof typeof Ionicons.glyphMap => {
    return orgType === 'personal' ? 'person-circle' : 'business';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading your profiles...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Transition Overlay */}
      <Animated.View 
        style={[
          styles.transitionOverlay,
          { 
            backgroundColor: colors.background,
            opacity: overlayOpacity,
          }
        ]}
        pointerEvents={isTransitioning ? "auto" : "none"}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.transitionText, { color: colors.text }]}>
          Switching Profile...
        </Text>
      </Animated.View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 60,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isTransitioning}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Select a profile to continue
            </Text>
          </View>

        {/* Profile Cards */}
        <View style={styles.profilesContainer}>
          {profiles.map((profile, index) => {
            const isPersonal = profile.org_type === 'personal';
            const roleColor = getRoleColor(profile.role);
            const isSelected = selectedId === profile.profile_id;

            return (
              <Animated.View
                key={profile.profile_id}
                style={{
                  transform: [{ scale: isSelected ? scaleAnim : 1 }],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.profileCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: isSelected ? colors.tint : colors.border,
                      borderWidth: isSelected ? 3 : 1,
                    },
                    isSelected && styles.profileCardSelected,
                  ]}
                  onPress={() => handleSelect(profile.profile_id)}
                  activeOpacity={0.7}
                  disabled={isTransitioning}
                >
                <View style={styles.profileContent}>
                  {/* Icon */}
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isPersonal
                          ? `${colors.tint}20`
                          : `${roleColor}20`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getOrgIcon(profile.org_type)}
                      size={32}
                      color={isPersonal ? colors.tint : roleColor}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.profileInfo}>
                    <Text style={[styles.orgName, { color: colors.text }]}>
                      {profile.org_name}
                    </Text>
                    
                    {profile.display_name && (
                      <Text style={[styles.displayName, { color: colors.textMuted }]}>
                        {profile.display_name}
                      </Text>
                    )}

                    {/* Role Badge */}
                    <View style={styles.roleBadge}>
                      <Ionicons
                        name={getRoleIcon(profile.role)}
                        size={14}
                        color={roleColor}
                      />
                      <Text style={[styles.roleText, { color: roleColor }]}>
                        {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Checkmark for selected */}
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
            );
          })}
        </View>

        {/* Create New Org Button */}
        {onCreateOrg && (
          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: `${colors.tint}15`,
                borderColor: colors.tint,
              },
            ]}
            onPress={onCreateOrg}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.tint} />
            <Text style={[styles.createButtonText, { color: colors.tint }]}>
              Create New Organization
            </Text>
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {profiles.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Profiles Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Create an organization to get started
            </Text>
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  transitionText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  profilesContainer: {
    gap: 16,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileCardSelected: {
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "700",
  },
  displayName: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});

