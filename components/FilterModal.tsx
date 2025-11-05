import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FilterOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters: FilterOption[] = [
  { id: "All", label: "All", icon: "apps" },
  { id: "Sessions", label: "Sessions", icon: "time" },
  { id: "Accuracy", label: "Accuracy", icon: "stats-chart" },
  { id: "Time", label: "Time", icon: "timer" },
];

export default function FilterModal({
  visible,
  onClose,
  selectedFilter,
  onFilterChange,
}: FilterModalProps) {
  const colors = useColors();

  const handleFilterPress = (filter: string) => {
    onFilterChange(filter);
    onClose();
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["50%"]}
      enablePanDownToClose
      backdropOpacity={0.45}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Filter by</Text>
        <View style={styles.filterList}>
          {filters.map((filter) => {
            const isSelected = filter.id === selectedFilter;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: isSelected
                      ? colors.indigo + "15"
                      : "transparent",
                    borderColor: isSelected ? colors.indigo : colors.border,
                  },
                ]}
                onPress={() => handleFilterPress(filter.id)}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons
                    name={filter.icon}
                    size={22}
                    color={isSelected ? colors.indigo : colors.text}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: isSelected ? colors.indigo : colors.text },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.indigo}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  filterList: {
    gap: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
