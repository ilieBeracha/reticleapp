import { CreateOrgModal } from "@/components/CreateOrg";
import { useColors } from "@/hooks/useColors";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DeleteOrgModal } from "./DeleteOrgModal";

export function ChildOrgsList() {
  const colors = useColors();
  const { userId } = useAuth();
  const {
    selectedOrgId,
    orgChildren,
    fetchOrgChildren,
    fetchUserOrgs,
    fetchAllOrgs,
    allOrgs,
  } = useOrganizationsStore();
  const { switchOrganization } = useOrganizationSwitch();

  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");

  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch children when component mounts or selectedOrg changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgChildren(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleNavigateToChild = async (childId: string, childName: string) => {
    await switchOrganization(childId, childName);
  };

  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    if (userId && selectedOrgId) {
      fetchUserOrgs(userId);
      fetchAllOrgs(userId);
      fetchOrgChildren(selectedOrgId);
    }
  };

  const handleDeleteClick = (childId: string, childName: string) => {
    setOrgToDelete({ id: childId, name: childName });
    setDeleteModalVisible(true);
  };

  const handleDeleteSuccess = () => {
    setDeleteModalVisible(false);
    setOrgToDelete(null);
    if (userId && selectedOrgId) {
      fetchUserOrgs(userId);
      fetchAllOrgs(userId);
      fetchOrgChildren(selectedOrgId);
    }
  };

  const currentOrg = allOrgs.find((org) => org.id === selectedOrgId);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={tintColor} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Create Child Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: colors.green, borderColor: colors.green },
          ]}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Child Organization</Text>
        </TouchableOpacity>

        {/* Children List */}
        {orgChildren.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: cardBackground, borderColor },
            ]}
          >
            <Ionicons name="git-branch-outline" size={32} color={mutedColor} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              No child organizations yet
            </Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
              Create child organizations to build your hierarchy
            </Text>
          </View>
        ) : (
          <View style={styles.childrenList}>
            {orgChildren.map((child) => (
              <View
                key={child.id}
                style={[
                  styles.childCard,
                  { backgroundColor: cardBackground, borderColor },
                ]}
              >
                <TouchableOpacity
                  style={styles.childContent}
                  onPress={() => handleNavigateToChild(child.id, child.name)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.childIcon,
                      { backgroundColor: colors.blue + "20" },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color={colors.blue}
                    />
                  </View>

                  <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: textColor }]}>
                      {child.name}
                    </Text>
                    <View style={styles.childMeta}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: colors.indigo + "15" },
                        ]}
                      >
                        <Text
                          style={[styles.typeText, { color: colors.indigo }]}
                        >
                          {child.org_type}
                        </Text>
                      </View>
                      <View style={styles.membersBadge}>
                        <Ionicons
                          name="people"
                          size={12}
                          color={mutedColor}
                        />
                        <Text style={[styles.membersText, { color: mutedColor }]}>
                          {child.member_count}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={mutedColor}
                  />
                </TouchableOpacity>

                {/* Delete Button */}
                <TouchableOpacity
                  style={[styles.deleteButton, { borderColor: "#ef4444" }]}
                  onPress={() => handleDeleteClick(child.id, child.name)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Modals */}
      <CreateOrgModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />

      {orgToDelete && (
        <DeleteOrgModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onSuccess={handleDeleteSuccess}
          organizationId={orgToDelete.id}
          organizationName={orgToDelete.name}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "center",
  },
  childrenList: {
    gap: 10,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 12,
  },
  childContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  childInfo: {
    flex: 1,
    gap: 6,
  },
  childName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
  },
  childMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  membersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  membersText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
