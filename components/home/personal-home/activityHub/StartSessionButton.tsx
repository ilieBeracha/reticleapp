import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from '@/theme/colors';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronRight, ChevronUp, Play, User, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { ThemeColors } from '../types';
import type { UpcomingTraining } from './types';
import { styles } from './styles';

/** Start session button with dropdown options (solo + training when available) */
export function StartSessionButton({
  colors,
  starting,
  upcomingTraining,
  onStartSolo,
  onGoToTraining,
}: {
  colors: ThemeColors;
  starting: boolean;
  upcomingTraining?: UpcomingTraining;
  onStartSolo: () => void;
  onGoToTraining: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasTeamOption = !!upcomingTraining;

  const handleToggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  };

  const handleSolo = () => {
    setExpanded(false);
    onStartSolo();
  };

  const handleTeam = () => {
    setExpanded(false);
    onGoToTraining();
  };

  return (
    <View style={styles.startSection}>
      {/* Start button (acts as dropdown trigger) */}
      <TouchableOpacity activeOpacity={0.9} onPress={handleToggleExpand} style={styles.startButton}>
        <LinearGradient
          colors={starting ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startGradient}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Play size={18} color="#fff" fill="#fff" />
              <Text style={styles.startText}>Start Session</Text>
              {expanded ? <ChevronUp size={14} color="#fff" /> : <ChevronDown size={14} color="#fff" />}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Dropdown */}
      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Solo option */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleSolo} style={styles.dropdownRow}>
            <View style={styles.dropdownIcon}>
              <User size={16} color={colors.text} />
            </View>
            <View style={styles.dropdownContent}>
              <Text style={[styles.dropdownTitle, { color: colors.text }]}>Solo Session</Text>
              <Text style={[styles.dropdownMeta, { color: colors.textMuted }]}>Personal practice</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {hasTeamOption && (
            <>
              <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />

              {/* Team training option */}
              <TouchableOpacity activeOpacity={0.8} onPress={handleTeam} style={styles.dropdownRow}>
                <View style={[styles.dropdownIcon, { backgroundColor: 'rgba(147,197,253,0.15)' }]}>
                  <Users size={16} color="#93C5FD" />
                </View>
                <View style={styles.dropdownContent}>
                  <Text style={[styles.dropdownTitle, { color: colors.text }]} numberOfLines={1}>
                    {upcomingTraining.title}
                  </Text>
                  <Text style={[styles.dropdownMeta, { color: colors.textMuted }]}>
                    {upcomingTraining.team_name && `${upcomingTraining.team_name} · `}
                    {upcomingTraining.scheduled_at
                      ? format(new Date(upcomingTraining.scheduled_at), 'EEE h:mm a')
                      : 'Team training'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}




