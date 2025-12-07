import { SessionTargetWithResults } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const IMAGE_HEIGHT = SHEET_HEIGHT * 0.40; // 40% of modal height

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
  
  // Animation
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Pan responder for drag to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset image state when opening
      setImageLoading(true);
      setImageError(false);
      
      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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

  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  const hasImage = isPaper && paperResult?.scanned_image_url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_HEIGHT,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Top Image Banner - 30% height, 100% width */}
        {hasImage ? (
          <View style={styles.imageBanner}>
            {imageLoading && !imageError && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="large" color="#10B981" />
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
                style={styles.bannerImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            )}
            {/* Gradient overlay for text readability */}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,15,0.8)', '#0F0F0F']}
              style={styles.imageGradient}
            />
            {/* Drag Handle on image */}
            <View {...panResponder.panHandlers} style={styles.handleAreaOnImage}>
              <View style={styles.handle} />
            </View>
            {/* Close button on image */}
            <TouchableOpacity style={styles.closeBtnOnImage} onPress={closeSheet}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            {/* Title overlay on image */}
            <View style={styles.titleOverlay}>
              <View style={[styles.icon, isPaper ? styles.iconPaper : styles.iconTactical]}>
                <Ionicons
                  name={isPaper ? 'disc-outline' : 'flash-outline'}
                  size={20}
                  color={isPaper ? '#3B82F6' : '#F59E0B'}
                />
              </View>
              <View>
                <Text style={styles.titleOnImage}>Target #{index}</Text>
                <Text style={styles.subtitleOnImage}>
                  {isPaper ? 'Paper Target' : 'Tactical'} • {target.distance_m}m
                </Text>
              </View>
            </View>
          </View>
        ) : (
          // No image - show regular header
          <>
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={styles.titleSection}>
                  <View style={[styles.icon, isPaper ? styles.iconPaper : styles.iconTactical]}>
                    <Ionicons
                      name={isPaper ? 'disc-outline' : 'flash-outline'}
                      size={22}
                      color={isPaper ? '#3B82F6' : '#F59E0B'}
                    />
                  </View>
                  <View>
                    <Text style={styles.title}>Target #{index}</Text>
                    <Text style={styles.subtitle}>
                      {isPaper ? 'Paper Target' : 'Tactical'} • {target.distance_m}m
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}>
                  <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Quick Stats Bar */}
        <View style={[styles.quickStats, hasImage && styles.quickStatsWithImage]}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{shots}</Text>
            <Text style={styles.quickStatLabel}>Shots</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: '#10B981' }]}>{hits}</Text>
            <Text style={styles.quickStatLabel}>Hits</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: accuracy >= 80 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : '#EF4444' }]}>
              {accuracy}%
            </Text>
            <Text style={styles.quickStatLabel}>Accuracy</Text>
          </View>
          {isPaper && paperResult?.dispersion_cm != null && (
            <>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatValue, { color: '#EF4444' }]}>
                  {paperResult.dispersion_cm.toFixed(1)}
                </Text>
                <Text style={styles.quickStatLabel}>Group (cm)</Text>
              </View>
            </>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* DETAILED RESULTS */}
          <View style={styles.resultsSection}>
            <Text style={styles.sectionLabel}>DETAILED RESULTS</Text>
            <View style={styles.resultsCard}>
              <ResultRow label="Shots Fired" value={shots} />
              <ResultRow label="Hits" value={hits} valueColor="#10B981" />
              {isPaper && paperResult?.hits_inside_scoring != null && (
                <ResultRow label="Inside Scoring Zone" value={paperResult.hits_inside_scoring} />
              )}
              {isPaper && paperResult?.dispersion_cm != null && (
                <ResultRow 
                  label="Group Size" 
                  value={`${paperResult.dispersion_cm.toFixed(1)} cm`} 
                  valueColor="#EF4444"
                />
              )}
              {isPaper && paperResult?.offset_right_cm != null && (
                <ResultRow 
                  label="Horizontal Offset" 
                  value={`${paperResult.offset_right_cm > 0 ? '+' : ''}${paperResult.offset_right_cm.toFixed(1)} cm`} 
                />
              )}
              {isPaper && paperResult?.offset_up_cm != null && (
                <ResultRow 
                  label="Vertical Offset" 
                  value={`${paperResult.offset_up_cm > 0 ? '+' : ''}${paperResult.offset_up_cm.toFixed(1)} cm`} 
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
                    <ResultRow label="Engagement Time" value={`${tacticalResult.time_seconds}s`} />
                  )}
                </>
              )}
            </View>
          </View>

          {/* DETAILS SECTION */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>TARGET INFO</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Ionicons name="resize-outline" size={20} color="#6366F1" />
                <Text style={styles.detailValue}>{target.distance_m}m</Text>
                <Text style={styles.detailLabel}>Distance</Text>
              </View>
              {target.lane_number && (
                <View style={styles.detailCard}>
                  <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                  <Text style={styles.detailValue}>{target.lane_number}</Text>
                  <Text style={styles.detailLabel}>Lane</Text>
                </View>
              )}
              {isPaper && paperResult?.paper_type && (
                <View style={styles.detailCard}>
                  <Ionicons name="document-outline" size={20} color="#10B981" />
                  <Text style={styles.detailValue}>{paperResult.paper_type}</Text>
                  <Text style={styles.detailLabel}>Type</Text>
                </View>
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

          {/* Bottom Spacer */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },

  // Image Banner - 30% height, 100% width
  imageBanner: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: IMAGE_HEIGHT * 0.5,
  },
  handleAreaOnImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnOnImage: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleOnImage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleOnImage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Handle (when no image)
  handleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },

  // Header (when no image)
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    width: 44,
    height: 44,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  quickStatsWithImage: {
    marginTop: -20,
    zIndex: 10,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 12,
    gap: 20,
  },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Image loader/error (inside banner)
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
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
    borderRadius: 14,
    padding: 16,
    gap: 14,
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
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  detailLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  // Notes Section
  notesSection: {},
  notesCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});
