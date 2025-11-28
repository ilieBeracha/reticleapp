import { useColors } from "@/hooks/ui/useColors";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";

export interface BaseBottomSheetRef {
  open: () => void;
  close: () => void;
  expand: () => void;
}

interface BaseBottomSheetProps {
  children: React.ReactNode;
  snapPoints?: string[];
  enableDynamicSizing?: boolean;
  backdropOpacity?: number;
  scrollToRefresh?: boolean;
  enablePanDownToClose?: boolean;
  closeOnBackdropPress?: boolean;
}

export const BaseBottomSheet = forwardRef<BaseBottomSheetRef, BaseBottomSheetProps>(
  ({ children, snapPoints, enableDynamicSizing = false, backdropOpacity = 0.8, scrollToRefresh = false, enablePanDownToClose = true, closeOnBackdropPress = true }, ref) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.snapToIndex(0),
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand(),
    }));

    const defaultSnapPoints = useMemo(() => snapPoints || ['50%'], [snapPoints]);

    const renderBackdrop = useCallback(
      (props: any) => (
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
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={enableDynamicSizing ? undefined : defaultSnapPoints}
        enableDynamicSizing={enableDynamicSizing}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: colors.background + 'F2' }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.textMuted + '4D' }]}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

BaseBottomSheet.displayName = 'BaseBottomSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  bottomSheetBackground: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});

