import { useColors } from '@/hooks/ui/useColors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface OrgSelectorProps {
  organizations: Array<{ id: string; name: string }>;
  selectedOrgId: string | null; // null = "All Organizations"
  onSelectOrg: (orgId: string | null) => void;
  onConnectPress: () => void;
}

export function OrgSelector({ 
  organizations, 
  selectedOrgId, 
  onSelectOrg,
  onConnectPress 
}: OrgSelectorProps) {
  const { text, textMuted, card, border } = useColors();

  const hasOrgs = organizations.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Organizations chip */}
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: card, borderColor: border },
            selectedOrgId === null && styles.chipActive,
            pressed && styles.pressed,
          ]}
          onPress={() => onSelectOrg(null)}
        >
          <Text style={[
            styles.chipText,
            { color: selectedOrgId === null ? text : textMuted },
            selectedOrgId === null && styles.chipTextActive,
          ]}>
            ✦ All Organizations
          </Text>
        </Pressable>

        {/* Organization chips */}
        {organizations.map((org) => (
          <Pressable
            key={org.id}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: card, borderColor: border },
              selectedOrgId === org.id && styles.chipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => onSelectOrg(org.id)}
          >
            <Text style={[
              styles.chipText,
              { color: selectedOrgId === org.id ? text : textMuted },
              selectedOrgId === org.id && styles.chipTextActive,
            ]}>
              {org.name}
            </Text>
          </Pressable>
        ))}

        {/* Connect Organization chip */}
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            styles.connectChip,
            { borderColor: border },
            pressed && styles.pressed,
          ]}
          onPress={onConnectPress}
        >
          <Text style={[styles.chipText, styles.connectText]}>
            + {hasOrgs ? 'Add' : 'Connect Org'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    fontWeight: '600',
  },
  connectChip: {
    borderStyle: 'dashed',
  },
  connectText: {
    color: '#10B981',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});

