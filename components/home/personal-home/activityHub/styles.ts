import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Container
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },

  // Shared card styles
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
  },

  // Live/Active badges
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10B98120',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#10B981',
  },

  // Team badge
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Join button
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Active session card
  activeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    padding: 14,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
  },

  // Continue row
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Last session card
  lastSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156,163,175,0.15)',
  },
  lastSessionInfo: {
    flex: 1,
  },
  lastSessionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  lastSessionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSessionDate: {
    fontSize: 11,
    marginTop: 2,
  },
  weeklyStats: {
    alignItems: 'flex-end',
  },
  weeklyValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  weeklyLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },

  // Start button section
  startSection: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonFlex: {
    flex: 1,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  startText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  teamToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Options toggle (always visible)
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  // Dropdown
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156,163,175,0.15)',
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
});











