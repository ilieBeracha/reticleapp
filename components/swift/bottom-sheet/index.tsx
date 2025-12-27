import { useColors } from '@/hooks/ui/useColors';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';

interface SwiftBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

// iOS-specific implementation using native SwiftUI
function IOSBottomSheet({ open, onOpenChange, children }: SwiftBottomSheetProps) {
  const { width } = useWindowDimensions();
  
  // Dynamically import to avoid Android issues
  const { BottomSheet: SwiftBottomSheet, Host } = require('@expo/ui/swift-ui');
  
  return (
    <Host style={{ position: 'absolute', width, height: '100%' }}>
      <SwiftBottomSheet 
        interactiveDismissDisabled={false} 
        presentationDetents={['medium', 'large']} 
        isOpened={open} 
        onIsOpenedChange={onOpenChange}
      >
        {children}
      </SwiftBottomSheet>
    </Host>
  );
}

// Android/fallback implementation using @gorhom/bottom-sheet
function AndroidBottomSheet({ open, onOpenChange, children, snapPoints = ['50%', '90%'] }: SwiftBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useColors();

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const backgroundStyle = useMemo(() => ({
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  }), [colors.card]);

  const handleIndicatorStyle = useMemo(() => ({
    backgroundColor: colors.textMuted,
    width: 36,
    height: 4,
  }), [colors.textMuted]);

  if (!open) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
    >
      <BottomSheetView style={styles.contentContainer}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

export default function SwiftBottomSheet(props: SwiftBottomSheetProps) {
  if (Platform.OS === 'ios') {
    return <IOSBottomSheet {...props} />;
  }
  return <AndroidBottomSheet {...props} />;
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingTop: 40,
  },
});