/**
 * StartPracticeCard Component
 * 
 * Call-to-action card to start a new shooting session.
 * Dark, sleek design for prominence.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ChevronRight, Crosshair } from 'lucide-react-native';
import { getStartPracticeSubtitle } from '../UnifiedHomePage.helpers';
import type { StartPracticeCardProps } from '../UnifiedHomePage.types';

export function StartPracticeCard({ 
  colors, 
  onPress, 
  starting, 
  lastSessionDaysAgo 
}: StartPracticeCardProps) {
  const subtitle = getStartPracticeSubtitle(lastSessionDaysAgo);

  return (
    <TouchableOpacity
      style={[
        localStyles.card, 
        { 
          backgroundColor: colors.card,
          borderColor: colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={starting}
    >
      <View style={[localStyles.iconContainer, { backgroundColor: colors.primary }]}>
        <Crosshair size={22} color="#fff" strokeWidth={2.5} />
      </View>
      <View style={localStyles.content}>
        <Text style={[localStyles.title, { color: colors.text }]}>Start Session</Text>
        <Text style={[localStyles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      {starting ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={[localStyles.arrow, { backgroundColor: colors.primary }]}>
          <ChevronRight size={18} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const localStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

