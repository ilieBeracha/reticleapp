
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export const SignOutButton = () => {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();  
      router.replace("/auth/sign-in");
    } catch (err) {
    console.error(JSON.stringify(err, null, 2));
  }
};

return (
  <TouchableOpacity onPress={handleSignOut}>
    <Text style={styles.text}>Sign out</Text>
  </TouchableOpacity>
);
};

const styles = StyleSheet.create({
  text: {
    color: "red",
    fontWeight: "600",
  },
  });