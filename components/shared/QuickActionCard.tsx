import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isPrimary?: boolean;
  color?: string;
  onPress: () => void;
}

const QuickActionCard = memo(function QuickActionCard({ 
  icon, 
  title, 
  subtitle, 
  isPrimary = false, 
  color,
  onPress 
}: QuickActionCardProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const actionColor = useMemo(() => color || colors.primary, [color, colors.primary]);

  const animatePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  // Memoize all dynamic styles
  const cardStyle = useMemo(() => [
    styles.card,
    { 
      backgroundColor: isPrimary ? colors.primary : colors.card, 
      borderColor: isPrimary ? colors.primary : colors.border 
    }
  ], [isPrimary, colors.primary, colors.card, colors.border]);

  const iconStyle = useMemo(() => [
    styles.icon,
    { backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.2)' : actionColor + '15' }
  ], [isPrimary, actionColor]);

  const iconColor = useMemo(() => 
    isPrimary ? '#fff' : actionColor
  , [isPrimary, actionColor]);

  const titleStyle = useMemo(() => [
    styles.title,
    { color: isPrimary ? '#fff' : colors.text }
  ], [isPrimary, colors.text]);

  const subtitleStyle = useMemo(() => [
    styles.subtitle,
    { color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : colors.textMuted }
  ], [isPrimary, colors.textMuted]);

  const chevronColor = useMemo(() => 
    isPrimary ? '#fff' : colors.textMuted
  , [isPrimary, colors.textMuted]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={iconStyle}>
            <Ionicons 
              name={icon} 
              size={20} 
              color={iconColor} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={titleStyle}>
              {title}
            </Text>
            <Text style={subtitleStyle}>
              {subtitle}
            </Text>
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={chevronColor} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default QuickActionCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
});

