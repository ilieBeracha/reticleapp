import { OrgDonutChart, KPIItem } from '@/components/organization/OrgDonutChart';
import { OrgStatCard } from '@/components/organization/OrgStatCard';
import { OrgTaskCard, OrgTaskCardProps } from '@/components/organization/OrgTaskCard';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Organization mode home page - displays team stats, KPIs, and tasks.
 * Extracted from workspace/index.tsx for better code organization.
 */
export const OrganizationHomePage = React.memo(function OrganizationHomePage() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [selectedPeriod, _setSelectedPeriod] = useState('Weekly');

  // KPI Data - memoized to avoid recreation on every render
  const kpiData = useMemo<KPIItem[]>(
    () => [
      { label: 'Stuck', value: 2, color: colors.red, percentage: 8 },
      { label: 'In Progress', value: 3, color: colors.yellow, percentage: 26 },
      { label: 'In Review', value: 3, color: colors.blue, percentage: 12 },
      { label: 'Done', value: 3, color: colors.green, percentage: 54 },
    ],
    [colors.red, colors.yellow, colors.blue, colors.green]
  );

  const totalTasks = 250;

  // Today's Tasks - memoized to avoid recreation
  const tasks = useMemo<Omit<OrgTaskCardProps, 'colors'>[]>(
    () => [
      {
        title: 'Create mood boards and visual references mobile apps.',
        date: '12/06/2024',
        hours: '09 hrs',
        progress: 26,
        status: 'On Progress',
        statusColor: '#FFD93D',
        percentage: 26,
        attachments: 2,
        subtasks: '02 / 12',
        comments: 2,
        likes: 12,
        teamMembers: ['A', 'B', '10+'],
      },
      {
        title: 'Create mood boards and visual references mobile apps.',
        date: '12/06/2024',
        hours: '09 hrs',
        progress: 26,
        status: 'On Progress',
        statusColor: '#FFD93D',
        percentage: 26,
        attachments: 2,
        subtasks: '02 / 12',
        comments: 2,
        likes: 12,
        teamMembers: ['A', 'B'],
      },
    ],
    []
  );

  // Stat cards data - memoized
  const statCards = useMemo(
    () => [
      { icon: 'file-text', title: 'Recent Task', count: '08 tasks', iconFamily: 'feather' as const },
      { icon: 'hourglass-half', title: 'Due Projects', count: '03 Projects', iconFamily: 'material' as const },
      { icon: 'at', title: 'Discussions', count: '04 Messages', iconFamily: 'feather' as const },
      { icon: 'message-circle', title: 'Comments', count: '03 Comments', iconFamily: 'feather' as const },
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stat Cards */}
        <ScrollView horizontal style={styles.statsGrid} showsHorizontalScrollIndicator={false}>
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Productivity KPIs</Text>
            <TouchableOpacity style={[styles.periodSelector, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.periodText, { color: colors.text }]}>{selectedPeriod}</Text>
              <Feather name="chevron-down" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.kpiContent, { backgroundColor: colors.card }]}>
            <OrgDonutChart data={kpiData} totalTasks={totalTasks} colors={chartColors} />

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

        {/* Today Task */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Today Task</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: colors.indigo }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {tasks.map((task, index) => (
            <OrgTaskCard key={index} {...task} colors={cardColors} />
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
