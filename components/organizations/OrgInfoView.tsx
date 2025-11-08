// components/organizations/OrgInfoView.tsx
// Shows current organization overview with role-specific actions

import { useColors } from "@/hooks/ui/useColors";
import type { FlatOrganization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrgInfoViewProps {
  org: FlatOrganization | null;
  isPersonalMode: boolean;
  onCreateChild: () => void;
  onInviteMembers: () => void;
  onViewMembers: () => void;
  onEditSettings: () => void;
  onSwitchOrg: () => void;
  childOrgs?: FlatOrganization[];
  onNavigateToChild?: (orgId: string) => void;
}

export function OrgInfoView({
  org,
  isPersonalMode,
  onCreateChild,
  onInviteMembers,
  onViewMembers,
  onEditSettings,
  onSwitchOrg,
  childOrgs = [],
  onNavigateToChild,
}: OrgInfoViewProps) {
  const colors = useColors();

  if (isPersonalMode) {
    return (
      <View style={styles.container}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Personal Workspace
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your private training space
        </Text>

        {/* Switch Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={onSwitchOrg}
        >
          <Ionicons name="swap-horizontal" size={20} color="white" />
          <Text style={styles.actionButtonText}>Switch Organization</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!org) return null;

  // Organization context
  const isCommander = org.role === "commander" && org.hasFullPermission;
  const isMember = org.role === "member";
  const isViewer = org.role === "viewer" || org.isContextOnly;

  // Check if at maximum depth (0-2 = 3 levels total)
  const MAX_DEPTH = 2;
  const isAtMaxDepth = org.depth >= MAX_DEPTH;

  // Root org info (top of hierarchy)
  const rootName = org.breadcrumb[0];
  const rootOrg = org.breadcrumb.length > 1 ? rootName : null;

  return (
    <View style={styles.container}>
      {/* Root Organization Context */}
      {rootOrg && (
        <View style={[styles.rootContext, { backgroundColor: colors.background }]}>
          <Ionicons name="business" size={14} color={colors.textMuted} />
          <Text style={[styles.rootText, { color: colors.textMuted }]}>
            Part of {rootOrg}
          </Text>
        </View>
      )}

      {/* Current Organization Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        {org.name}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {org.org_type} • {org.role === "commander" && org.isRoot ? "Root Admin" : org.role.charAt(0).toUpperCase() + org.role.slice(1)}
      </Text>

      {/* Visual Hierarchy Presentation */}
      <View style={[styles.hierarchyFlow, { backgroundColor: colors.background }]}>
        <Text style={[styles.flowTitle, { color: colors.textMuted }]}>
          YOUR POSITION
        </Text>
        
        {org.breadcrumb.map((levelName, index) => {
          const isCurrentLevel = index === org.breadcrumb.length - 1;
          const levelColors = [colors.purple, colors.blue, colors.teal, colors.green, colors.yellow];
          const levelColor = levelColors[index % levelColors.length];

          return (
            <View key={index} style={styles.hierarchyLevel}>
              {/* Connection line */}
              {index > 0 && (
                <View style={[styles.connectionLine, { backgroundColor: levelColor + "30" }]} />
              )}
              
              {/* Level item */}
              <View style={styles.levelRow}>
                <View style={[
                  styles.levelDot, 
                  { 
                    backgroundColor: isCurrentLevel ? levelColor : levelColor + "30",
                    width: isCurrentLevel ? 24 : 16,
                    height: isCurrentLevel ? 24 : 16,
                    borderRadius: isCurrentLevel ? 12 : 8,
                  }
                ]}>
                  {isCurrentLevel && (
                    <View style={[styles.levelDotInner, { backgroundColor: colors.background }]} />
                  )}
                </View>
                
                <View style={styles.levelInfo}>
                  <Text style={[
                    styles.levelName, 
                    { color: isCurrentLevel ? colors.text : colors.textMuted },
                    isCurrentLevel && styles.currentLevelName,
                  ]}>
                    {levelName}
                  </Text>
                  {isCurrentLevel && (
                    <View style={styles.youAreHere}>
                      <Ionicons name="location" size={12} color={levelColor} />
                      <Text style={[styles.youAreHereText, { color: levelColor }]}>
                        You are here
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Child orgs indicator */}
        {org.childCount > 0 && (
          <View style={styles.childrenIndicator}>
            <View style={[styles.connectionLine, { backgroundColor: colors.border }]} />
            <View style={styles.childrenRow}>
              <Ionicons name="git-network" size={16} color={colors.textMuted} />
              <Text style={[styles.childrenText, { color: colors.textMuted }]}>
                {org.childCount} team{org.childCount > 1 ? 's' : ''} below
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Drill-Down Navigation for Commanders */}
      {childOrgs.length > 0 && onNavigateToChild && (
        <View style={[styles.drillDownSection, { backgroundColor: colors.green + '10', borderColor: colors.green }]}>
          <View style={styles.drillDownHeader}>
            <Ionicons name="arrow-down-circle" size={20} color={colors.green} />
            <Text style={[styles.drillDownTitle, { color: colors.green }]}>
              YOUR UNITS ({childOrgs.length})
            </Text>
          </View>
          <Text style={[styles.drillDownSubtitle, { color: colors.textMuted }]}>
            Tap to focus on a specific unit
          </Text>
          
          <View style={styles.unitsList}>
            {childOrgs.map((childOrg) => (
              <TouchableOpacity
                key={childOrg.id}
                style={[styles.unitItem, { backgroundColor: colors.cardBackground }]}
                onPress={() => onNavigateToChild(childOrg.id)}
                activeOpacity={0.7}
              >
                <View style={styles.unitLeft}>
                  <Ionicons 
                    name={
                      childOrg.depth === 1 ? 'people' :  // Company/Team
                      childOrg.depth === 2 ? 'shield' :  // Platoon/Squad
                      'business'
                    }
                    size={22} 
                    color={colors.green} 
                  />
                  <View style={styles.unitInfo}>
                    <Text style={[styles.unitName, { color: colors.text }]}>
                      {childOrg.name}
                    </Text>
                    <Text style={[styles.unitLevel, { color: colors.textMuted }]}>
                      {childOrg.depth === 1 ? 'Company' : childOrg.depth === 2 ? 'Platoon' : `Level ${childOrg.depth}`}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {/* Commander Actions */}
        {isCommander && (
          <>
            {/* Only show Create Sub-Org button if NOT at max depth */}
            {!isAtMaxDepth ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                onPress={onCreateChild}
              >
                <Ionicons name="git-branch" size={20} color="white" />
                <Text style={styles.actionButtonText}>Create Sub-Organization</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.maxDepthInfo, { backgroundColor: colors.yellow + '10', borderColor: colors.yellow }]}>
                <Ionicons name="information-circle" size={20} color={colors.yellow} />
                <Text style={[styles.maxDepthText, { color: colors.textMuted }]}>
                  Maximum hierarchy depth reached. Cannot create sub-organizations at this level.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.green }]}
              onPress={onInviteMembers}
            >
              <Ionicons name="person-add" size={20} color="white" />
              <Text style={styles.actionButtonText}>Invite Members</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Switch Org Button */}
        <TouchableOpacity
          style={[styles.switchButton, { borderColor: colors.tint }]}
          onPress={onSwitchOrg}
        >
          <Ionicons name="swap-horizontal" size={20} color={colors.tint} />
          <Text style={[styles.switchButtonText, { color: colors.tint }]}>
            Switch Organization
          </Text>
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
  rootContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  rootText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  hierarchyFlow: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  flowTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  hierarchyLevel: {
    marginBottom: 4,
  },
  connectionLine: {
    width: 3,
    height: 20,
    marginLeft: 10,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelDot: {
    alignItems: "center",
    justifyContent: "center",
  },
  levelDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  currentLevelName: {
    fontWeight: "700",
    fontSize: 17,
  },
  youAreHere: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  youAreHereText: {
    fontSize: 12,
    fontWeight: "600",
  },
  childrenIndicator: {
    marginTop: 4,
  },
  childrenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  childrenText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  maxDepthInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  maxDepthText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 4,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  drillDownSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  drillDownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  drillDownTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  drillDownSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  unitsList: {
    gap: 8,
  },
  unitItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
  },
  unitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  unitLevel: {
    fontSize: 12,
    marginTop: 2,
  },
});

