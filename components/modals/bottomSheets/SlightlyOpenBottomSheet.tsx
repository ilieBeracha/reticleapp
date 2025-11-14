import { ThemedText } from "@/components/ThemedText";
import {
    BottomSheet,
    BottomSheetBackdrop,
    BottomSheetContent,
    BottomSheetDragIndicator,
    BottomSheetPortal,
} from "@/components/ui/bottomsheet";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { View } from "react-native";

export const SlightlyOpenBottomSheet = () => {
  const { user } = useAuth();

  // Check if user was created within the last 5 minutes
  const isNewUser = useMemo(() => {
    if (!user?.created_at) return false;

    const createdAt = new Date(user.created_at);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    const isNew = diffInMinutes <= 5;
    
    if (isNew) {
      console.log(`🆕 New user! Created ${diffInMinutes.toFixed(1)} minutes ago`);
    }

    return isNew;
  }, [user?.created_at]);

  return (
    <BottomSheet>
      <BottomSheetPortal
        snapPoints={["100%", "20%", "50%", "90%"]}
        defaultIsOpen={true}
        snapToIndex={isNewUser ? 0 : 2}
        enablePanDownToClose={!isNewUser} // Can't close if new user
        handleComponent={BottomSheetDragIndicator}
        backdropComponent={BottomSheetBackdrop}
      >
        <BottomSheetContent>
          <View className="p-6">
            <ThemedText className="text-xl font-bold">
              {isNewUser 
                ? "Welcome! 🎉 You're a new user! Complete onboarding to continue."
                : "Hello World! 👋"}
            </ThemedText>
          </View>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
};