import { ThemedText } from "@/components/ThemedText";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CreateOrgModal } from "./CreateOrg";
import { OrganizationSwitcherModal } from "./OrganizationSwitcherModal";

/**
 * Example component demonstrating how to use both modals independently
 * This shows that the modals are now properly separated and can be used
 * in different contexts without nesting issues.
 */
export function ModalTestExample() {
  const [orgSwitcherVisible, setOrgSwitcherVisible] = useState(false);
  const [createOrgVisible, setCreateOrgVisible] = useState(false);

  const handleCreateOrgSuccess = () => {
    console.log("Organization created successfully!");
    // You can add any additional logic here after org creation
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Modal Test Example</ThemedText>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setOrgSwitcherVisible(true)}
      >
        <ThemedText style={styles.buttonText}>
          Open Organization Switcher
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setCreateOrgVisible(true)}
      >
        <ThemedText style={styles.buttonText}>
          Open Create Organization
        </ThemedText>
      </TouchableOpacity>

      {/* Both modals can now be used independently */}
      <OrganizationSwitcherModal
        visible={orgSwitcherVisible}
        onClose={() => setOrgSwitcherVisible(false)}
      />

      <CreateOrgModal
        visible={createOrgVisible}
        onClose={() => setCreateOrgVisible(false)}
        onSuccess={handleCreateOrgSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
