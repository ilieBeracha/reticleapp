// components/organizations/OrgInfoView.tsx
// Shows current organization overview with role-specific actions

import { useColors } from "@/hooks/ui/useColors";
import type { UserOrgContext } from "@/services/organizationsService";
import type { OrgChild } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrgInfoViewProps {
  orgContext: UserOrgContext | null;
  isPersonalMode: boolean;
  childOrgs?: OrgChild[];
  hasOrganizations?: boolean;  // Does user have any org memberships?
  onCreateChild: () => void;
  onInviteMembers: () => void;
  onViewMembers: () => void;
  onEditSettings: () => void;
  onSwitchOrg: () => void;
}

export function OrgInfoView({
  orgContext,
  isPersonalMode,
  childOrgs = [],
  onCreateChild,
  onInviteMembers,
  onViewMembers,
  onEditSettings,
  onSwitchOrg,
  hasOrganizations,
}: OrgInfoViewProps) {
  const colors = useColors();

  if (isPersonalMode) {
    return (
      <View style={styles.container}>
        {/* Personal Badge */}
        <View style={[styles.personalBadge, { backgroundColor: colors.blue + '15' }]}>
          <Ionicons name="person" size={24} color={colors.blue} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Personal Workspace
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your private training space
        </Text>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.blue} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Only you can see your personal sessions
            </Text>
          </View>
        </View>

        {/* Actions Menu - Only show if user has orgs */}

          <View style={styles.actionsMenu}>
            {/* Switch to Organization */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onSwitchOrg}
              activeOpacity={0.6}
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.text} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Switch to an organization
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        
      </View>
    );
  }

  if (!orgContext) return null;

  // Simplified permissions from context
  const isCommander = orgContext.role === "commander";
  const isMember = orgContext.role === "member";
  const isViewer = orgContext.role === "viewer";

  // Check if at maximum depth
  const MAX_DEPTH = 2;
  const isAtMaxDepth = orgContext.orgDepth >= MAX_DEPTH;

  return (
    <View style={styles.container}>
      {/* Organization Icon Badge */}
      <View style={[styles.orgBadge, { backgroundColor: colors.tint + '15' }]}>
        <Ionicons 
          name={
            orgContext.orgDepth === 0 ? 'business' :
            orgContext.orgDepth === 1 ? 'people' :
            'shield'
          }
          size={24} 
          color={colors.tint} 
        />
      </View>

      {/* Current Organization Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        {orgContext.orgName}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {orgContext.orgType} • {orgContext.role === "commander" && orgContext.orgDepth === 0 ? "Root Admin" : orgContext.role.charAt(0).toUpperCase() + orgContext.role.slice(1)}
      </Text>

      {/* Breadcrumb */}
      {orgContext.fullPath && orgContext.orgDepth > 0 && (
        <View style={[styles.breadcrumbChip, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="layers" size={12} color={colors.textMuted} />
          <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>
            {orgContext.fullPath}
          </Text>
        </View>
      )}

      {/* Organization Stats */}
      <View style={[styles.statsGrid, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {childOrgs.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Sub-units
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="people" size={20} color={colors.textMuted} />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Members
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Ionicons name="fitness" size={20} color={colors.textMuted} />
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Trainings
          </Text>
        </View>
      </View>

      {/* Child Organizations - Info Only (No Navigation) */}
      {childOrgs.length > 0 && (
        <View style={styles.childOrgsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sub-Organizations ({childOrgs.length})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Managed from this level
            </Text>
          </View>
          
          <View style={styles.childOrgsList}>
            {childOrgs.slice(0, 5).map((childOrg) => (
              <View
                key={childOrg.id}
                style={[styles.childOrgCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              >
                <View style={[styles.childOrgIcon, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons 
                    name={
                      childOrg.depth === 1 ? 'people' :
                      childOrg.depth === 2 ? 'shield' :
                      'business'
                    }
                    size={18} 
                    color={colors.tint} 
                  />
                </View>
                <View style={styles.childOrgInfo}>
                  <Text style={[styles.childOrgName, { color: colors.text }]}>
                    {childOrg.name}
                  </Text>
                  <Text style={[styles.childOrgType, { color: colors.textMuted }]}>
                    {childOrg.org_type} • {childOrg.member_count || 0} members
                  </Text>
                </View>
              </View>
            ))}
            {childOrgs.length > 5 && (
              <Text style={[styles.moreChildrenText, { color: colors.textMuted }]}>
                +{childOrgs.length - 5} more
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Actions Menu */}
      <View style={styles.actionsMenu}>
        {/* Max Depth Info */}
        {isCommander && isAtMaxDepth && (
          <View style={[styles.infoCard, { backgroundColor: colors.yellow + '15', marginBottom: 12 }]}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={18} color={colors.yellow} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                Maximum depth reached (no child orgs allowed)
              </Text>
            </View>
          </View>
        )}

        {/* Create Sub-Org (Commander only, not at max depth) */}
        {orgContext.canCreateChild && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onCreateChild}
            activeOpacity={0.6}
          >
            <Ionicons name="git-branch" size={20} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Create sub-organization
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Invite Members (Commander only) */}
        {orgContext.canManageMembers && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onInviteMembers}
            activeOpacity={0.6}
          >
            <Ionicons name="person-add" size={20} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Invite members
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* View Members (All users) */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onViewMembers}
          activeOpacity={0.6}
        >
          <Ionicons name="people" size={20} color={colors.text} />
          <Text style={[styles.menuItemText, { color: colors.text }]}>
            View members ({orgContext.scopeOrgIds.length} org{orgContext.scopeOrgIds.length !== 1 ? 's' : ''})
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Edit Settings (Commander only) */}
        {orgContext.canManageOrg && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={onEditSettings}
            activeOpacity={0.6}
          >
            <Ionicons name="settings" size={20} color={colors.text} />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Organization settings
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

        {/* Switch Organization - Always show in org mode */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onSwitchOrg}
          activeOpacity={0.6}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.text} />
          <Text style={[styles.menuItemText, { color: colors.text }]}>
            Switch organization
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  personalBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  orgBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  breadcrumbChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  breadcrumbText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  childOrgsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  childOrgsList: {
    gap: 8,
  },
  childOrgCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  childOrgIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  childOrgInfo: {
    flex: 1,
    gap: 2,
  },
  childOrgName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  childOrgType: {
    fontSize: 12,
    fontWeight: "500",
  },
  moreChildrenText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  maxDepthBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  maxDepthBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  actionsMenu: {
    marginTop: 8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  menuDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.3,
  },
  infoRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  infoCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});

