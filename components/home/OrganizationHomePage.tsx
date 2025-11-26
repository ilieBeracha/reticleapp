import { KPIItem, OrgDonutChart } from '@/components/organization/OrgDonutChart';
import { OrgStatCard } from '@/components/organization/OrgStatCard';
import { OrgTaskCard, OrgTaskCardProps } from '@/components/organization/OrgTaskCard';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppContext } from '@/hooks/useAppContext';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Organization mode home page - displays team training stats, session overview, and active sessions.
 * Extracted from workspace/index.tsx for better code organization.
 */
export const OrganizationHomePage = React.memo(function OrganizationHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { activeWorkspace } = useAppContext();
  const { orgRole, hasTeam, teamInfo } = useOrgRole();
  const [selectedPeriod, _setSelectedPeriod] = useState('Weekly');

  // Role descriptions (3-4 words)
  const roleDescriptions: Record<string, string> = {
    owner: 'Full workspace control',
    admin: 'Manage teams & members',
    instructor: 'Create training sessions',
    member: 'Participate in activities',
  };

  // Build subtitle dynamically
  const subtitle = useMemo(() => {
    const roleDesc = roleDescriptions[orgRole] || 'Member';
    
    if (hasTeam && teamInfo) {
      // Show team name and role
      const teamRoleDisplay = teamInfo.teamRole.split('_').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
      return `${teamRoleDisplay} • ${teamInfo.teamName}`;
    }
    
    // Just show role description
    return roleDesc;
  }, [orgRole, hasTeam, teamInfo]);

  // KPI Data - memoized to avoid recreation on every render
  const kpiData = useMemo<KPIItem[]>(
    () => [
      { label: 'Not Started', value: 2, color: colors.red, percentage: 8 },
      { label: 'Active', value: 3, color: colors.yellow, percentage: 26 },
      { label: 'Resting', value: 3, color: colors.blue, percentage: 12 },
      { label: 'Completed', value: 3, color: colors.green, percentage: 54 },
    ],
    [colors.red, colors.yellow, colors.blue, colors.green]
  );

  const totalSessions = 250;

  // Today's Sessions - memoized to avoid recreation
  const sessions = useMemo<Omit<OrgTaskCardProps, 'colors'>[]>(
    () => [
      {
        title: 'Morning cardio and strength training session',
        date: '12/06/2024',
        hours: '02 hrs',
        progress: 75,
        status: 'In Progress',
        statusColor: '#FFD93D',
        percentage: 75,
        attachments: 3,
        subtasks: '08 / 12',
        comments: 5,
        likes: 18,
        teamMembers: ['A', 'B', '10+'],
      },
      {
        title: 'Team combat drills and tactical exercises',
        date: '12/06/2024',
        hours: '03 hrs',
        progress: 45,
        status: 'Active',
        statusColor: '#10B981',
        percentage: 45,
        attachments: 2,
        subtasks: '04 / 10',
        comments: 3,
        likes: 12,
        teamMembers: ['A', 'B'],
      },
    ],
    []
  );

  // Stat cards data - memoized
  const statCards = useMemo(
    () => [
      { icon: 'activity', title: 'Active Sessions', count: '08 sessions', iconFamily: 'feather' as const },
      { icon: 'time-outline', title: 'Scheduled', count: '03 upcoming', iconFamily: 'ionicons' as const },
      { icon: 'users', title: 'Team Members', count: '24 active', iconFamily: 'feather' as const },
      { icon: 'trending-up', title: 'Progress', count: '+12% growth', iconFamily: 'feather' as const },
    ],
    []
  );

  // Colors object for child components - memoized
  const cardColors = useMemo(
    () => ({
      card: colors.card,
      secondary: colors.secondary,
      icon: colors.icon,
      textMuted: colors.textMuted,
      text: colors.text,
    }),
    [colors.card, colors.secondary, colors.icon, colors.textMuted, colors.text]
  );

  const chartColors = useMemo(
    () => ({
      text: colors.text,
      textMuted: colors.textMuted,
    }),
    [colors.text, colors.textMuted]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {activeWorkspace?.workspace_name || 'Organization'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        </View>

        {/* Stat Cards */}
        <ScrollView horizontal style={styles.statsGrid} showsHorizontalScrollIndicator={false} removeClippedSubviews={true}>
          {statCards.map((stat, index) => (
            <OrgStatCard
              key={index}
              icon={stat.icon}
              title={stat.title}
              count={stat.count}
              iconFamily={stat.iconFamily}
              colors={cardColors}
            />
          ))}
        </ScrollView>

        {/* Productivity KPIs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Overview</Text>
            <TouchableOpacity style={[styles.periodSelector, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.periodText, { color: colors.text }]}>{selectedPeriod}</Text>
              <Feather name="chevron-down" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.kpiContent, { backgroundColor: colors.card }]}>
            <OrgDonutChart data={kpiData} totalTasks={totalSessions} colors={chartColors} />

            <View style={styles.kpiLegend}>
              {kpiData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.legendValue, { color: colors.icon }]}>
                    ({item.value.toString().padStart(2, '0')})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Today Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Training</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.indigo }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {sessions.map((session, index) => (
            <OrgTaskCard key={index} {...session} colors={cardColors} />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.1,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    display: 'flex',
    width: '100%',
    overflow: 'scroll',
    paddingTop: 16,
    paddingHorizontal: 14,
    gap: 12,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  kpiContent: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 24,
  },
  kpiLegend: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 14,
  },
});

export default OrganizationHomePage;
