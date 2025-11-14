import { ActivityCard } from '@/components/dashboard/ActivityCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { OrgSelector } from '@/components/dashboard/OrgSelector';
import { OrgStatusBanner } from '@/components/dashboard/OrgStatusBanner';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { WeekCalendar } from '@/components/ui/WeekCalendar';
import { useDashboard } from '@/hooks/services/useDashboard';
import { CalendarEvent, getTodayString, useCalendar } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function HomePage() {
  const router = useRouter();
  const { stats, organizations, recentActivity, loading, error } = useDashboard();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const colors = useColors();

  // Sample upcoming trainings (TODO: Replace with real data from backend)
  const upcomingTrainings = useMemo<CalendarEvent[]>(() => [
    {
      id: '1',
      date: getTodayString(),
      title: 'Sniper Qualification',
      type: 'qualification',
    },
    {
      id: '2',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Team Exercise',
      type: 'training',
    },
    {
      id: '3',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Assessment',
      type: 'assessment',
    },
  ], []);

  const {
    selectedDate,
    setSelectedDate,
    markedDates,
    handleDayPress,
    selectedDateEvents,
  } = useCalendar(upcomingTrainings);

  const handleOrganizationPress = (orgId: string) => {
    // TODO: Navigate to organization detail page
    router.push('/(protected)/modal');
  };

  const handleConnectOrg = () => {
    // TODO: Navigate to connect/create organization flow
    router.push('/(protected)/modal');
  };

  const handleViewFullCalendar = () => {
    router.push('/(protected)/calendar-demo');
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" />
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return null;
  }

  // Filter data based on selected org
  const filteredOrganizations = selectedOrgId 
    ? organizations.filter(org => org.id === selectedOrgId)
    : organizations;

  const filteredActivity = selectedOrgId
    ? recentActivity.filter(activity => activity.id === selectedOrgId) // TODO: Add orgId to activity type
    : recentActivity;

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader title="All Trainings" count={12} />
        {/* Organization Selector */}
        <OrgSelector
          organizations={organizations.map(org => ({ id: org.id, name: org.name }))}
          selectedOrgId={selectedOrgId}
          onSelectOrg={setSelectedOrgId}
          onConnectPress={handleConnectOrg}
        />

        {/* Status Banner (shows only if no orgs) */}
        <OrgStatusBanner
          organizationCount={organizations.length}
          onConnectPress={handleConnectOrg}
        />

        {/* Training Calendar Section */}
        <View style={styles.section}>
          <SectionHeader
            title="This Week" 
            showSeeMore={true}
            onSeeMorePress={handleViewFullCalendar}
          />
          
          <WeekCalendar
            onDayPress={setSelectedDate}
            markedDates={markedDates}
            selectedDate={selectedDate}
          />

          {/* Selected Date Events */}
          {selectedDate && selectedDateEvents.length > 0 && (
            <Animated.View 
              entering={FadeInDown.duration(300).springify()}
              style={[styles.eventsCard, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.eventsTitle, { color: colors.text }]}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {selectedDateEvents.map((event) => (
                <View 
                  key={event.id} 
                  style={[styles.eventItem, { borderLeftColor: colors.accent }]}
                >
                  <Text style={[styles.eventTitle, { color: colors.text }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.eventType, { color: colors.textMuted }]}>
                    {event.type}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader 
            title={selectedOrgId ? "Organization Activity" : "Recent Activity"} 
          />
          {filteredActivity.length > 0 ? (
            filteredActivity.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>
      </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventsCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  eventsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventItem: {
    paddingLeft: 12,
    borderLeftWidth: 3,
    gap: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
