import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isPrimary?: boolean;
  color?: string;
  onPress: () => void;
}

export default function QuickActionCard({ 
  icon, 
  title, 
  subtitle, 
  isPrimary = false, 
  color,
  onPress 
}: QuickActionCardProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const actionColor = color || colors.primary;

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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: isPrimary ? colors.primary : colors.card, 
            borderColor: isPrimary ? colors.primary : colors.border 
          }
        ]}
        onPress={onPress}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={[
            styles.icon,
            { backgroundColor: isPrimary ? 'rgba(255, 255, 255, 0.2)' : actionColor + '15' }
          ]}>
            <Ionicons 
              name={icon} 
              size={20} 
              color={isPrimary ? '#fff' : actionColor} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[
              styles.title,
              { color: isPrimary ? '#fff' : colors.text }
            ]}>
              {title}
            </Text>
            <Text style={[
              styles.subtitle,
              { color: isPrimary ? 'rgba(255, 255, 255, 0.8)' : colors.textMuted }
            ]}>
              {subtitle}
            </Text>
          </View>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={isPrimary ? '#fff' : colors.textMuted} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

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

