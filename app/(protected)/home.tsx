import { useAuth } from "@/contexts/AuthContext";
import { StyleSheet, Text, View } from "react-native";

export default function HomePage() {
  const { signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>home</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 24,
    fontWeight: "500",
  },
});

