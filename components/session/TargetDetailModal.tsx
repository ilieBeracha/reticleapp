import { SessionTargetWithResults } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================
interface TargetDetailModalProps {
  target: SessionTargetWithResults | null;
  index: number;
  visible: boolean;
  onClose: () => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const ResultRow = React.memo(function ResultRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
});

// ============================================================================
// COMPONENT
// ============================================================================
export const TargetDetailModal = React.memo(function TargetDetailModal({
  target,
  index,
  visible,
  onClose,
}: TargetDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  if (!target) return null;

  const isPaper = target.target_type === 'paper';
  const paperResult = target.paper_result;
  const tacticalResult = target.tactical_result;

  // Calculate stats
  let hits = 0;
  let shots = 0;

  if (isPaper && paperResult) {
    hits = paperResult.hits_total ?? 0;
    shots = paperResult.bullets_fired;
  } else if (!isPaper && tacticalResult) {
    hits = tacticalResult.hits;
    shots = tacticalResult.bullets_fired;
  }

  const hasImage = isPaper && paperResult?.scanned_image_url;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <View style={styles.titleSection}>
              <View style={[styles.icon, isPaper ? styles.iconPaper : styles.iconTactical]}>
                <Ionicons
                  name={isPaper ? 'disc-outline' : 'flash-outline'}
                  size={24}
                  color={isPaper ? '#3B82F6' : '#F59E0B'}
                />
              </View>
              <View>
                <Text style={styles.title}>Target #{index}</Text>
                <Text style={styles.subtitle}>
                  {isPaper ? 'Paper' : 'Tactical'} • {target.distance_m}m
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* IMAGE SECTION */}
          {hasImage && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>SCANNED TARGET</Text>
              <View style={styles.imageContainer}>
                {imageLoading && !imageError && (
                  <View style={styles.imageLoader}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={styles.imageLoaderText}>Loading image...</Text>
                  </View>
                )}
                {imageError ? (
                  <View style={styles.imageError}>
                    <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.imageErrorText}>Failed to load image</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: paperResult!.scanned_image_url! }}
                    style={styles.image}
                    resizeMode="contain"
                    onLoadStart={() => setImageLoading(true)}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}
              </View>
            </View>
          )}

          {/* RESULTS SECTION */}
          <View style={styles.resultsSection}>
            <Text style={styles.sectionLabel}>RESULTS</Text>
            <View style={styles.resultsCard}>
              <ResultRow label="Shots Fired" value={shots} />
              <ResultRow label="Hits" value={hits} valueColor="#10B981" />
              {isPaper && paperResult?.hits_inside_scoring != null && (
                <ResultRow label="Inside Scoring" value={paperResult.hits_inside_scoring} />
              )}
              {isPaper && paperResult?.dispersion_cm != null && (
                <ResultRow 
                  label="Group Size" 
                  value={`${paperResult.dispersion_cm.toFixed(1)} cm`} 
                  valueColor="#EF4444"
                />
              )}
              {!isPaper && tacticalResult && (
                <>
                  <ResultRow
                    label="Stage Cleared"
                    value={tacticalResult.is_stage_cleared ? 'Yes' : 'No'}
                    valueColor={tacticalResult.is_stage_cleared ? '#10B981' : '#EF4444'}
                  />
                  {tacticalResult.time_seconds && (
                    <ResultRow label="Time" value={`${tacticalResult.time_seconds}s`} />
                  )}
                </>
              )}
            </View>
          </View>

          {/* DETAILS SECTION */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>DETAILS</Text>
            <View style={styles.detailsCard}>
              <ResultRow label="Distance" value={`${target.distance_m}m`} />
              {target.lane_number && (
                <ResultRow label="Lane" value={target.lane_number} />
              )}
              {isPaper && paperResult?.paper_type && (
                <ResultRow label="Paper Type" value={paperResult.paper_type} />
              )}
            </View>
          </View>

          {/* NOTES SECTION */}
          {(target.notes || paperResult?.notes || tacticalResult?.notes) && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>
                  {target.notes || paperResult?.notes || tacticalResult?.notes}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  grabber: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPaper: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  iconTactical: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // Image Section
  imageSection: {},
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  imageLoaderText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  imageError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  imageErrorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },

  // Results Section
  resultsSection: {},
  resultsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Details Section
  detailsSection: {},
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },

  // Notes Section
  notesSection: {},
  notesCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});

