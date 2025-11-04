import { useThemeColor } from "@/hooks/useThemeColor";

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";

export interface BaseBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: string[] | number[];
  enablePanDownToClose?: boolean;
  backdropOpacity?: number;
  children: React.ReactNode;
  keyboardBehavior?: "interactive" | "extend" | "fillParent";
  /** Enable dynamic sizing based on content */
  enableDynamicSizing?: boolean;
  /** Index to snap to when keyboard opens (-1 for last) */
  keyboardSnapPoint?: number;
  /** Enable automatic snap to highest point when keyboard opens and back when it closes */
  enableKeyboardAutoSnap?: boolean;
  /** Use BottomSheetScrollView for scrollable content (better gesture handling) */
  scrollable?: boolean;
}

export default function BaseBottomSheet({
  visible,
  onClose,
  snapPoints: customSnapPoints,
  enablePanDownToClose = true,
  backdropOpacity = 0.6,
  children,
  keyboardBehavior = "interactive",
  enableDynamicSizing = true,
  keyboardSnapPoint,
  enableKeyboardAutoSnap = true,
  scrollable = false,
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
  const snapPoints = useMemo(() => {
    if (enableDynamicSizing) return undefined;
    return customSnapPoints || ["50%"];
  }, [customSnapPoints, enableDynamicSizing]);

  // Open/close bottom sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Handle keyboard show/hide to adjust snap points
  useEffect(() => {
    // Skip keyboard auto-snap if:
    // - Not visible
    // - Feature is disabled
    // - Using dynamic sizing (snapPoints is undefined)
    // - No snap points defined or only one snap point
    if (
      !visible ||
      !enableKeyboardAutoSnap ||
      enableDynamicSizing || // Dynamic sizing doesn't use snap points
      !snapPoints ||
      !Array.isArray(snapPoints) ||
      snapPoints.length <= 1
    )
      return;

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        // Use keyboardSnapPoint if provided, otherwise snap to the last (highest) snap point
        const targetIndex = keyboardSnapPoint !== undefined 
          ? keyboardSnapPoint 
          : snapPoints.length - 1;
        
        // Ensure the index is within valid range (0 to length - 1)
        if (targetIndex >= 0 && targetIndex < snapPoints.length) {
          bottomSheetRef.current?.snapToIndex(targetIndex);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Snap back to the first (lowest) snap point when keyboard closes
        bottomSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [visible, enableKeyboardAutoSnap, enableDynamicSizing, snapPoints, keyboardSnapPoint]);

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
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor }}
      handleIndicatorStyle={{
        backgroundColor: mutedForeground,
        opacity: 0.6,
        width: 56,
        height: 6,
        borderRadius: 3,
      }}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      {scrollable ? (
        <BottomSheetScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.container}>
          <View style={styles.content}>{children}</View>
        </BottomSheetView>
      )}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
