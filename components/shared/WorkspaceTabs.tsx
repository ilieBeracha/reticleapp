import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WorkspaceTabsProps {
  activeTab: 'overview' | 'manage';
  onTabChange: (tab: 'overview' | 'manage') => void;
  showManageTab: boolean;
}

export default function WorkspaceTabs({ activeTab, onTabChange, showManageTab }: WorkspaceTabsProps) {
  const colors = useColors();

  return (
    <View style={[styles.tabBar]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'overview' && [styles.tabActive, { borderBottomColor: colors.primary }]
        ]}
        onPress={() => onTabChange('overview')}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="stats-chart" 
          size={18} 
          color={activeTab === 'overview' ? colors.primary : colors.textMuted} 
        />
        <Text style={[
          styles.tabText,
          { color: activeTab === 'overview' ? colors.primary : colors.textMuted }
        ]}>
          Overview
        </Text>
      </TouchableOpacity>

      {showManageTab && (
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'manage' && [styles.tabActive, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => onTabChange('manage')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="settings" 
            size={18} 
            color={activeTab === 'manage' ? colors.primary : colors.textMuted} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'manage' ? colors.primary : colors.textMuted }
          ]}>
            Manage
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',



    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});

