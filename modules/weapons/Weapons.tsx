import { HeaderSearchBar } from "@/components/HeaderSearchBar";
import { ThemedView } from "@/components/ThemedView";
import { FlatList, Text } from "react-native";

export function Weapons() {
  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}>
      <HeaderSearchBar onSearch={() => {}} />
      <FlatList
        data={[]}
        renderItem={({ item }) => <Text>{item}</Text>}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 16 }}
      />
    </ThemedView>
  );
}
