import { useColors } from "@/hooks/ui/useColors";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";

export interface BaseDetachedBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface BaseDetachedBottomSheetProps {
  children: React.ReactNode;
}

export const BaseDetachedBottomSheet = forwardRef<BaseDetachedBottomSheetRef, BaseDetachedBottomSheetProps>(
  ({ children }, ref) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.snapToIndex(0),
      close: () => bottomSheetRef.current?.close(),
    }));

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
          pressBehavior="close"
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        enableDynamicSizing={true}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: colors.background + 'F2' }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.textMuted + '4D' }]}
        detached={true}
        bottomInset={8}
        style={styles.bottomSheetContainer}
      >
        <BottomSheetView style={styles.sheetContent}>
          {children}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

BaseDetachedBottomSheet.displayName = 'BaseDetachedBottomSheet';

const styles = StyleSheet.create({
  bottomSheetContainer: {
    marginHorizontal: 8,
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 55,
    borderBottomRightRadius: 55,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});

