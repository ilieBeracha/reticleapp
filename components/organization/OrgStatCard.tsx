import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

type IconFamily = 'feather' | 'material' | 'ionicons';

export interface OrgStatCardProps {
  icon: string;
  title: string;
  count: string;
  iconFamily: IconFamily;
  colors: {
    card: string;
    secondary: string;
    icon: string;
    textMuted: string;
    text: string;
  };
}

const iconComponents = {
  feather: Feather,
  material: MaterialCommunityIcons,
  ionicons: Ionicons,
} as const;

/**
 * Organization stat card component - displays a single KPI stat with icon.
 * Extracted from OrganizationHomePage for reusability and performance.
 */
export const OrgStatCard = React.memo(function OrgStatCard({
  icon,
  title,
  count,
  iconFamily,
  colors,
}: OrgStatCardProps) {
  const { width } = useWindowDimensions();
  const IconComponent = iconComponents[iconFamily];
  const cardWidth = (width - 52) / 2;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, width: cardWidth }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
        <IconComponent name={icon as any} size={24} color={colors.icon} />
      </View>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.text }]}>{count}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  count: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default OrgStatCard;
