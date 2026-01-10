/**
 * AddDrillModal Component
 * Modal for adding drills to a training
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus, Search, Target, X } from 'lucide-react-native';
import type { Drill } from '@/types/workspace';
import type { Colors } from './types';

interface AddDrillModalProps {
  visible: boolean;
  onClose: () => void;
  drills: Drill[];
  filteredDrills: Drill[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddDrill: (drill: Drill) => void;
  loading: boolean;
  adding: boolean;
  colors: Colors;
}

export function AddDrillModal({
  visible,
  onClose,
  drills,
  filteredDrills,
  searchQuery,
  onSearchChange,
  onAddDrill,
  loading,
  adding,
  colors,
}: AddDrillModalProps) {
  const handleClose = () => {
    onSearchChange('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Add Drill</Text>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search drills..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.textMuted} />
        ) : filteredDrills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Target size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? 'No drills match your search' : 'No team drills available'}
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.list} 
            contentContainerStyle={styles.listContent}
          >
            {filteredDrills.map(drill => (
              <TouchableOpacity
                key={drill.id}
                style={[styles.drillItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onAddDrill(drill)}
                disabled={adding}
              >
                <View style={styles.drillInfo}>
                  <Text style={[styles.drillName, { color: colors.text }]}>{drill.name}</Text>
                  <Text style={[styles.drillMeta, { color: colors.textMuted }]}>
                    {drill.distance_m}m • {drill.rounds_per_shooter} rounds
                  </Text>
                </View>
                {adding ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Plus size={20} color={colors.text} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  list: {
    flex: 1,
    padding: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  drillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  drillMeta: {
    fontSize: 13,
  },
});
