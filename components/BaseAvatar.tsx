import { useColors } from '@/hooks/ui/useColors';
import React from 'react';
import { Image, ImageStyle, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface BaseAvatarProps {
  /** Image source URI or require() */
  source?: { uri: string } | number;
  /** Fallback text (usually initials) */
  fallbackText?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom image style */
  imageStyle?: ImageStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Background color (defaults to primary) */
  backgroundColor?: string;
  /** Text color (defaults to primaryForeground) */
  textColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 54,
  lg: 64,
  xl: 96,
};

const TEXT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 32,
};

export function BaseAvatar({
  source,
  fallbackText,
  size = 'md',
  style,
  imageStyle,
  textStyle,
  backgroundColor,
  textColor,
  borderColor,
  borderWidth = 0,
}: BaseAvatarProps) {
  const colors = useColors();
  
  const sizeValue = SIZE_MAP[size];
  const textSize = TEXT_SIZE_MAP[size];
  const bgColor = backgroundColor || colors.primary;
  const txtColor = textColor || colors.primaryForeground;

  const containerStyle = [
    styles.container,
    {
      width: sizeValue,
      height: sizeValue,
      borderRadius: sizeValue / 2,
      backgroundColor: bgColor,
      borderWidth: borderWidth,
      borderColor: borderColor,
    },
    style,
  ];

  const imageStyles = [
    styles.image,
    {
      width: sizeValue,
      height: sizeValue,
      borderRadius: sizeValue / 2,
    },
    imageStyle,
  ];

  const textStyles = [
    styles.text,
    {
      fontSize: textSize,
      color: txtColor,
    },
    textStyle,
  ];

  return (
    <View style={containerStyle}>
      {source ? (
        <Image
          source={typeof source === 'number' ? source : source}
          style={imageStyles}
          resizeMode="cover"
        />
      ) : fallbackText ? (
        <Text style={textStyles} numberOfLines={1}>
          {fallbackText.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

