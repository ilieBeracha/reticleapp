import { BaseButton } from "@/components/ui/baseButton";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { StepProps } from "../types";
import { SessionInfo } from "./SessionInfo";

export function SessionNameStep({
  formData,
  updateFormData,
  onNext,
}: StepProps) {
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();

  return (
    <View style={styles.container}>
      <SessionInfo 
        title="Name Your Session" 
        subtitle="Give it a memorable name and select the type"
      />

      {/* Form Content */}
      <View style={styles.content}>
        {/* Session Type - Only show in org context */}
        {selectedOrgId && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Session Type
            </Text>
            
            {/* Individual Option */}
            <TouchableOpacity
            style={[
              styles.typeOption,
              !formData.isSquad && styles.typeOptionSelected,
              {
                backgroundColor: !formData.isSquad ? colors.blue + "12" : colors.cardBackground,
                borderColor: !formData.isSquad ? colors.blue : colors.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => updateFormData({ isSquad: false })}
          >
            <View style={styles.typeLeft}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: !formData.isSquad ? colors.blue : colors.cardBackground },
                ]}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={!formData.isSquad ? "#FFF" : colors.description}
                />
              </View>
              <View style={styles.typeTextContainer}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>
                  Individual
                </Text>
                <Text style={[styles.typeSubtitle, { color: colors.description }]}>
                  Solo training session
                </Text>
              </View>
            </View>
            {!formData.isSquad && (
              <Ionicons name="checkmark-circle" size={24} color={colors.blue} />
            )}
          </TouchableOpacity>

          {/* Squad Option */}
          <TouchableOpacity
            style={[
              styles.typeOption,
              formData.isSquad && styles.typeOptionSelected,
              {
                backgroundColor: formData.isSquad ? colors.blue + "12" : colors.cardBackground,
                borderColor: formData.isSquad ? colors.blue : colors.border,
                borderWidth: 2,
              },
            ]}
            onPress={() => updateFormData({ isSquad: true })}
          >
            <View style={styles.typeLeft}>
              <View
                style={[
                  styles.typeIconContainer,
                  { backgroundColor: formData.isSquad ? colors.blue : colors.cardBackground },
                ]}
              >
                <Ionicons
                  name="people"
                  size={24}
                  color={formData.isSquad ? "#FFF" : colors.description}
                />
              </View>
              <View style={styles.typeTextContainer}>
                <Text style={[styles.typeTitle, { color: colors.text }]}>
                  Squad Training
                </Text>
                <Text style={[styles.typeSubtitle, { color: colors.description }]}>
                  Multiple participants
                </Text>
              </View>
            </View>
            {formData.isSquad && (
              <Ionicons name="checkmark-circle" size={24} color={colors.blue} />
            )}
          </TouchableOpacity>
          </View>
        )}

        {/* Session Name */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>
            Session Name <Text style={{ color: colors.description }}>(optional)</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={formData.name}
            onChangeText={(text) => updateFormData({ name: text })}
            placeholder="e.g. Morning Practice"
            placeholderTextColor={colors.description}
            autoFocus={false}
          />
        </View>
      </View>

      {/* Navigation */}
      <View style={[styles.navigation, { marginTop: 20 }]}>
        <BaseButton
          style={[
            { backgroundColor: colors.blue, flex: 1, justifyContent: "center", alignItems: "center" },
          ]}
          onPress={onNext}
        >
          <Text style={[styles.navButtonText, { color: "#FFF" }]}>
            Continue
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </BaseButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  content: {
    flex: 1,
    gap: 20,

  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeOptionSelected: {},
  typeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  typeTextContainer: {
    flex: 1,
    gap: 2,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  typeSubtitle: {
    fontSize: 12,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  navigation: {
    marginTop: "auto",

  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

