import { ActivityCard } from '@/components/dashboard/ActivityCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { OrganizationCard } from '@/components/dashboard/OrganizationCard';
import { OrgSelector } from '@/components/dashboard/OrgSelector';
import { OrgStatusBanner } from '@/components/dashboard/OrgStatusBanner';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { ThemedView } from '@/components/ThemedView';
import { useDashboard } from '@/hooks/services/useDashboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomePage() {
  const router = useRouter();
  const { stats, organizations, recentActivity, loading, error } = useDashboard();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const handleOrganizationPress = (orgId: string) => {
    // TODO: Navigate to organization detail page
    router.push('/(protected)/modal');
  };

  const handleConnectOrg = () => {
    // TODO: Navigate to connect/create organization flow
    router.push('/(protected)/modal');
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </ThemedView>
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

  return (
    <ThemedView style={styles.container}>
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
        
        <StatsRow stats={stats} />

        <View style={styles.section}>
          <SectionHeader 
            title={selectedOrgId ? "Organization" : "Organizations"} 
            showSeeMore={!selectedOrgId && organizations.length > 2}
          />
          {filteredOrganizations.length > 0 ? (
            filteredOrganizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                onPress={() => handleOrganizationPress(org.id)}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No organizations yet</Text>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
