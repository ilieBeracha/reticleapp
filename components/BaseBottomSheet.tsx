import { useThemeColor } from "@/hooks/useThemeColor";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";

export interface BaseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: string[] | number[];
  enablePanDownToClose?: boolean;
  backdropOpacity?: number;
  children: React.ReactNode;
}

export default function BaseBottomSheet({
  visible,
  onClose,
  snapPoints: customSnapPoints,
  enablePanDownToClose = true,
  backdropOpacity = 0.6,
  children,
}: BaseBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const colorScheme = useColorScheme();

  const cardBackground = useThemeColor({}, "cardBackground");
  const mutedForeground = useThemeColor({}, "description");

  // Use much darker background in dark mode for better contrast
  const backgroundColor =
    colorScheme === "dark"
      ? "#121212" // Pure black in dark mode
      : cardBackground;

  // Default snap points if not provided
  const snapPoints = useMemo(
    () => customSnapPoints || ["50%"],
    [customSnapPoints]
  );

  // Open/close bottom sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Render backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        pressBehavior="close"
      />
    ),
    [backdropOpacity]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor }}
      handleIndicatorStyle={{
        backgroundColor: mutedForeground,
        opacity: 0.3,
        width: 40,
        height: 4,
      }}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.content}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
