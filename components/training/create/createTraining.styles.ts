/**
 * Styles for Create Training Screen
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: { alignItems: 'center', paddingVertical: 24 },
  headerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },

  // Stepper
  stepperWrap: { marginBottom: 18 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stepperItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperCircleText: { fontSize: 13, fontWeight: '800' },
  stepperLabel: { fontSize: 13, fontWeight: '700' },
  stepperLine: { width: 36, height: 2, borderRadius: 2 },

  // Step Header
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3 },

  // Next/Back buttons
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
  },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: 16 },
  backLinkText: { fontSize: 15, fontWeight: '600' },

  // Input Section
  inputSection: { marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600' },
  required: { fontSize: 14, fontWeight: '600' },
  inputWrapper: { borderRadius: 12, borderWidth: 1.5 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 15 },

  // Date Row
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateBtnText: { fontSize: 15, fontWeight: '500' },

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  toggleDesc: { fontSize: 12 },
  switch: { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  switchThumbActive: { alignSelf: 'flex-end' },

  // Timeline
  timeline: { marginBottom: 20 },
  timelineSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  timelineSummaryStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timelineStat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timelineStatValue: { fontSize: 18, fontWeight: '700' },
  timelineStatLabel: { fontSize: 12 },
  timelineStatDivider: { width: 1, height: 16 },

  // Timeline rail
  timelineRail: { paddingLeft: 20 },
  timelineNode: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLineTop: { position: 'absolute', left: 11, top: 0, width: 2, height: 12 },
  timelineLineBottom: { position: 'absolute', left: 11, top: 36, bottom: -12, width: 2 },
  timelineCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12, zIndex: 1 },
  timelineCircleText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  // Timeline content
  timelineContent: { flex: 1, marginLeft: 12, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  timelineContentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  timelineDrillName: { fontSize: 15, fontWeight: '600', flex: 1 },
  timelineTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  timelineTypeText: { fontSize: 10, fontWeight: '700' },
  timelineContentStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timelineStatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timelineChipText: { fontSize: 11, fontWeight: '500' },

  // Timeline actions
  timelineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timelineActionBtn: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },

  // Timeline end
  timelineEnd: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  timelineEndCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  timelineEndText: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },

  // Library Section
  libSection: { borderRadius: 12, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  libHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  libTitle: { fontSize: 15, fontWeight: '600' },
  libNewLink: { fontSize: 14, fontWeight: '600' },

  // Library tabs
  libTabs: { flexDirection: 'row', marginHorizontal: 10, borderRadius: 8, padding: 3, marginBottom: 8 },
  libTab: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  libTabText: { fontSize: 12, fontWeight: '600' },

  // Library list
  libList: {},
  libItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  libItemIndicator: { width: 3, height: 24, borderRadius: 2 },
  libItemContent: { flex: 1, gap: 2 },
  libItemName: { fontSize: 14, fontWeight: '600' },
  libItemMeta: { fontSize: 12 },

  // Library empty
  libEmpty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  libEmptyText: { fontSize: 13 },
  libEmptyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  libEmptyBtnText: { fontSize: 13, fontWeight: '600' },

  // Create Button
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8, marginBottom: 12 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  footerHint: { fontSize: 12, textAlign: 'center', marginBottom: 20 },

  // Team Selector
  teamSelector: { marginHorizontal: -4 },
  teamOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 4,
  },
  teamOptionName: { fontSize: 14, fontWeight: '600', maxWidth: 100 },
  teamSelected: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  teamSelectedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teamSelectedName: { fontSize: 15, fontWeight: '600' },
  lockedBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  teamPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  teamPromptText: { fontSize: 13, flex: 1 },

  // Not Available
  notAvailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  notAvailableIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  notAvailableTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  notAvailableDesc: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  notAvailableActions: { flexDirection: 'row', gap: 12 },
  notAvailableBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  notAvailableBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  notAvailableBtnSecondary: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  notAvailableBtnTextSecondary: { fontSize: 14, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalCancel: { fontSize: 16 },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  // Form
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  formInput: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  formRow: { flexDirection: 'row', gap: 10 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 12, borderWidth: 1.5 },
  typeBtnText: { fontSize: 15, fontWeight: '600' },

  // Date Picker Modal
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  datePickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  datePickerGrabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  datePickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  datePickerTitle: { fontSize: 17, fontWeight: '600' },
  datePickerCancel: { fontSize: 16 },
  datePickerDone: { fontSize: 16, fontWeight: '600' },
  datePickerWheel: { height: 200, alignSelf: 'center', width: '100%' },
});

