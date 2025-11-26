import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Liquid Glass Sheet - iOS 26+ Native Form Sheet
 * 
 * This sheet uses the new iOS 26 liquid glass aesthetic with:
 * - Transparent background with blur
 * - Native sheet grabber
 * - Multiple detent levels (10%, 50%, 100%)
 * - Swipe to dismiss
 */
export default function LiquidGlassSheet() {
  const colors = useColors();

  const handleClose = () => {
    router.back();
  };

  // Content to display in the sheet
  const renderContent = () => (
    <View style={styles.content}>
      {/* Handle indicator (visual only, native grabber handles interaction) */}
      <View style={[styles.handleContainer]}>
        <View style={[styles.handle, { backgroundColor: colors.textMuted + '40' }]} />
      </View>

      {/* Sheet Content */}
      <View style={styles.body}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          Liquid Glass
        </Text>
        
        <Text style={[styles.description, { color: colors.textMuted }]}>
          This is a native iOS form sheet with the new liquid glass aesthetic. 
          Drag the grabber to resize or swipe down to dismiss.
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              Got it
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // On iOS, use BlurView for the glass effect
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={80} tint="systemMaterial" style={styles.container}>
        {renderContent()}
      </BlurView>
    );
  }

  // On Android, use a semi-transparent background
  return (
    <View style={[styles.container, { backgroundColor: colors.card + 'F0' }]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

