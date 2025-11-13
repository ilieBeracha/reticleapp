import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, type ReactNode } from "react";
import { StyleSheet } from "react-native";

interface BaseBottomSheetProps {
  children: ReactNode;
  snapPoints?: string[] | number[];
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  backgroundStyle?: object;
  handleStyle?: object;
  onDismiss?: () => void;
}

export const BaseBottomSheet = forwardRef<BottomSheetModal, BaseBottomSheetProps>(
  (
    {
      children,
      snapPoints = ["50%"],
      enableDynamicSizing = false,
      enablePanDownToClose = true,
      backgroundStyle,
      handleStyle,
      onDismiss,
    },
    ref
  ) => {
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.background, backgroundStyle]}
        handleStyle={[styles.handle, handleStyle]}
        onDismiss={onDismiss}
      >
        <BottomSheetView style={styles.contentContainer}>
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

BaseBottomSheet.displayName = "BaseBottomSheet";

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
});
