import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { StyleSheet, Text, View } from 'react-native';

export default function HomePage() {
  // ✨ SINGLE SOURCE OF TRUTH
  const {
    userId,
    email,
    fullName,
    workspaceId,
    activeWorkspace,
    isPersonal,
    isOrganization,
    workspaces,
  } = useAppContext();

  console.log('activeWorkspace', activeWorkspace)
  console.log('workspaces', workspaces)
  console.log('isPersonal', isPersonal)
  console.log('isOrganization', isOrganization)
  console.log('userId', userId)
  console.log('email', email)
  console.log('fullName', fullName)
  console.log('workspaceId', workspaceId)
  console.log('isPersonal', isPersonal)
  console.log('isOrganization', isOrganization)
  console.log('workspaces', workspaces)
  console.log('activeWorkspace', activeWorkspace)
  console.log('workspaceId', workspaceId)
  console.log('isPersonal', isPersonal)
  console.log('isOrganization', isOrganization)
  
  const colors = useColors();
  const workspaceName = activeWorkspace?.name;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome, {fullName || 'User'}
        </Text>
        
        <View style={styles.infoCard}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{email}</Text>
          
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Context</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {isPersonal ? '🏠 Personal' : '🏢 Organization'}
          </Text>
          
          {isOrganization && (
            <>
              <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Active Workspace</Text>
              <Text style={[styles.value, { color: colors.text }]}>{workspaceName}</Text>
            </>
          )}
          
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>Total Workspaces</Text>
          <Text style={[styles.value, { color: colors.text }]}>{workspaces.length}</Text>
          
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 16 }]}>User ID</Text>
          <Text style={[styles.valueSmall, { color: colors.textMuted }]}>{userId?.slice(0, 20)}...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 17,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'monospace',
  },
});
