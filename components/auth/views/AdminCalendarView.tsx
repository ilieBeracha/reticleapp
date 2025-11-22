import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { ActivityIndicator, View } from 'react-native';

// Role-specific calendar views
import AdminCalendarView from './AdminCalendarView';
import TeamTrainingCalendarView from './TeamTrainingCalendarView';
import TrainingSessionsView from './TrainingSessionsView';

/**
 * ROLE-AWARE CALENDAR PAGE
 * Shows appropriate calendar view based on user's role
 */
export default function CalendarPage() {
  const { orgRole, teamRole, loading } = useOrgRole();
  const colors = useColors();

  if (loading) {
  return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

  // Admin/Owner/Instructor → Full organization calendar
  if (orgRole === 'owner' || orgRole === 'admin' || orgRole === 'instructor') {
    return <AdminCalendarView />;
  }

  // Team Commander → Team training calendar
  if (orgRole === 'member' && teamRole === 'commander') {
    return <TeamTrainingCalendarView />;
  }

  // Squad Commander or Soldier → Training sessions view
  if (orgRole === 'member' && (teamRole === 'squad_commander' || teamRole === 'soldier')) {
    return <TrainingSessionsView />;
  }

  // No team → Show admin calendar (limited visibility)
  return <AdminCalendarView />;
}
