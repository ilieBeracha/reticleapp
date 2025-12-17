import { StyleSheet } from 'react-native';
import { CARD_RADIUS, SMALL_RADIUS } from './constants';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  greetingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greetingAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },

  // Cards Row
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
    minHeight: 140,
  },

  // Radial Progress
  radialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
    overflow: 'hidden',
  },
  ringSegment: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  glowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  radialStats: {
    flex: 1,
    gap: 8,
  },
  radialStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radialStatText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: SMALL_RADIUS,
    gap: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Active Banner
  activeBanner: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  activeBannerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Start
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  quickStartIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartContent: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickStartDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Recent Activity
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Teams
  teamsSection: {
    marginBottom: 16,
  },

  // Single team card (when user has 1 team)
  singleTeamCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  singleTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  singleTeamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleTeamInfo: {
    flex: 1,
  },
  singleTeamName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  singleTeamRole: {
    fontSize: 13,
    marginTop: 2,
  },
  singleTeamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  singleTeamStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singleTeamStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  singleTeamStatLabel: {
    fontSize: 13,
  },
  singleTeamStatDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 16,
  },
  singleTeamAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singleTeamActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Multiple teams scroll
  teamsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  teamCard: {
    width: 140,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  teamCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCardName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  teamCardLive: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamCardLiveText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Training Card
  trainingsList: {
    gap: 10,
  },
  trainingCard: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
  },
  trainingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamTagText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  drillsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});






