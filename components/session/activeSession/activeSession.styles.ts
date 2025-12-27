/**
 * Styles for Active Session Screen
 */

import { StyleSheet } from 'react-native';
import { SIZES } from './activeSession.constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  closeButton: {
    width: SIZES.closeButtonSize,
    height: SIZES.closeButtonSize,
    borderRadius: SIZES.closeButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: SIZES.liveDotSize,
    height: SIZES.liveDotSize,
    borderRadius: SIZES.liveDotSize / 2,
    backgroundColor: '#10B981',
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Drill Banner
  drillBanner: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  drillBannerInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  drillInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillTypeIcon: {
    width: SIZES.drillTypeIconSize,
    height: SIZES.drillTypeIconSize,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillInfoText: {
    flex: 1,
  },
  drillRequirements: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drillReqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drillReqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  drillCompleteBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  drillProgressBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  drillProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  drillProgressText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Stats
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  accuracyCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  accuracyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: -4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  listContent: {
    gap: 10,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: SIZES.emptyIconSize,
    height: SIZES.emptyIconSize,
    borderRadius: SIZES.emptyIconSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Status States
  statusIcon: {
    width: SIZES.statusIconSize,
    height: SIZES.statusIconSize,
    borderRadius: SIZES.statusIconSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Watch Waiting Full Page
  watchWaitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  watchWaitingIconContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  watchWaitingPulseOuter: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    borderRadius: 72,
    borderWidth: 2,
    opacity: 0.3,
  },
  watchWaitingIconBg: {
    width: SIZES.watchIconBgSize,
    height: SIZES.watchIconBgSize,
    borderRadius: SIZES.watchIconBgSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchWaitingText: {
    alignItems: 'center',
    marginBottom: 24,
  },
  watchWaitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  watchWaitingDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  watchWaitingDrillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  watchWaitingDrillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchWaitingDrillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  watchWaitingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  watchWaitingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  watchWaitingStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  watchWaitingBottom: {
    paddingHorizontal: 20,
  },
  watchWaitingEndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  watchWaitingEndText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Watch Failed State
  watchFailedActions: {
    width: '100%',
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  watchFailedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  watchFailedRetryButton: {
    backgroundColor: '#10B981',
  },
  watchFailedRetryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  watchFailedButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  watchFailedCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

