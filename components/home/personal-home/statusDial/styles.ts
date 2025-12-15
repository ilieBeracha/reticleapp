import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },

  // Active Session
  activeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
  },
  activeHeader: {
    marginBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#10B981',
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  activeStat: {
    alignItems: 'center',
  },
  activeStatValue: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  activeStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.3)',
  },
  resumeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },

  // Start Session Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  startButtonIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    flex: 1,
  },
  startTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  startDesc: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Training Card
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  trainingLeft: {
    flex: 1,
    gap: 4,
  },
  trainingLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDotRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveTextRed: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#EF4444',
  },
  trainingScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduledText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
  },
});


