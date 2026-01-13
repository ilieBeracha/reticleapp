/**
 * UnifiedHomePage Styles
 * 
 * All styles for the unified home page and its sub-components.
 */

import { StyleSheet } from 'react-native';
import { CARD_RADIUS, SMALL_RADIUS } from './UnifiedHomePage.constants';

export const styles = StyleSheet.create({
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTAINER
  // ═══════════════════════════════════════════════════════════════════════════
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  greeting: { 
    fontSize: 13, 
    fontWeight: '500', 
    marginBottom: 1 
  },
  userName: { 
    fontSize: 18, 
    fontWeight: '700', 
    letterSpacing: -0.3 
  },
  watchBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COACH MESSAGE
  // ═══════════════════════════════════════════════════════════════════════════
  coachMessage: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.7,
    width: '65%',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  section: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEEKLY STATS CARD
  // ═══════════════════════════════════════════════════════════════════════════
  weeklyCard: {
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weeklyTitle: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  weeklyHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  streakText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#F97316' 
  },
  weeklySessionCount: { fontSize: 12 },
  weeklyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weeklyStatValue: { 
    fontSize: 15, 
    fontWeight: '700' 
  },
  weeklyStatLabel: { fontSize: 10 },
  weeklyStatDivider: { 
    width: 1, 
    height: 28 
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVE SESSION CARD
  // ═══════════════════════════════════════════════════════════════════════════
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
  },
  activeCardLeft: { flex: 1 },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  activeTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  activeMeta: { fontSize: 13 },
  activeArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // START PRACTICE CARD
  // ═══════════════════════════════════════════════════════════════════════════
  startCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    gap: 14,
  },
  startIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startContent: { flex: 1 },
  startTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  startSubtitle: { fontSize: 13 },
  startArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING CARD
  // ═══════════════════════════════════════════════════════════════════════════
  trainingsList: { gap: 8 },
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
  },
  trainingCardContent: { flex: 1 },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F97316',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 0.3,
  },
  trainingTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    flex: 1 
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainingTeam: { 
    fontSize: 12, 
    fontWeight: '500' 
  },
  metaDot: { 
    width: 3, 
    height: 3, 
    borderRadius: 1.5, 
    marginHorizontal: 4 
  },
  trainingDrills: { fontSize: 12 },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY TEAM
  // ═══════════════════════════════════════════════════════════════════════════
  emptyTeam: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
    gap: 10,
  },
  emptyTeamText: { 
    flex: 1, 
    fontSize: 13, 
    fontWeight: '500' 
  },
  viewScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewScheduleText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RECENT LIST
  // ═══════════════════════════════════════════════════════════════════════════
  recentList: {
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentContent: { flex: 1 },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  recentTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    flex: 1 
  },
  recentMeta: { fontSize: 11 },
  recentRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  recentTime: { 
    fontSize: 10, 
    fontWeight: '500' 
  },
  recentDivider: { 
    height: 1, 
    marginLeft: 56 
  },
  bioBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

