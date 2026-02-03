/**
 * Profile Sheet
 *
 * Personal account settings displayed as a bottom sheet.
 */
import { BaseAvatar } from '@/components/shared/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Language } from '@/services/i18n';
import { sendTestNotification } from '@/services/notifications';
import { useAudioStore } from '@/stores/audioStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light', icon: 'sunny' as const },
  { value: 'dark' as const, label: 'Dark', icon: 'moon' as const },
  { value: 'system' as const, label: 'System', icon: 'phone-portrait' as const },
];

const LANGUAGE_OPTIONS: { value: Language; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'he', label: 'Hebrew', nativeLabel: 'עברית' },
];

export default function ProfileSheet() {
  const colors = useColors();
  const { t } = useTranslation();
  const { fullName, email } = useAppContext();
  const { signOut, profileAvatarUrl } = useAuth();
  const { isEnabled: notificationsEnabled, requestPermission } = useNotifications();
  const { preference, setPreference } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [showThemeOptions, setShowThemeOptions] = useState(false);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [showAudioDemo, setShowAudioDemo] = useState(false);

  // Audio shot detection
  const {
    isListening: audioListening,
    isModuleLoaded: audioModuleLoaded,
    detectionCount: audioDetectionCount,
    lastDetection,
    start: startAudio,
    stop: stopAudio,
    reset: resetAudio,
  } = useAudioStore();

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioListening) {
        stopAudio();
      }
    };
  }, [audioListening, stopAudio]);

  const handleToggleAudio = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (audioListening) {
      stopAudio();
    } else {
      startAudio();
    }
  }, [audioListening, startAudio, stopAudio]);

  const handleResetAudio = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetAudio();
  }, [resetAudio]);

  const handleTestNotification = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!notificationsEnabled) {
      const granted = await requestPermission();
      if (!granted) {
        await delay(2000);
        Alert.alert('Notifications Disabled', 'Please enable notifications in your device settings.', [{ text: 'OK' }]);
        return;
      }
    }

    await sendTestNotification();
    Alert.alert('Notification Scheduled', 'You will receive a test notification in 3 seconds.');
  }, [notificationsEnabled, requestPermission]);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Sign out error:', error);
          }
        },
      },
    ]);
  }, [signOut]);

  const avatarUri = profileAvatarUrl;
  const fallbackInitial = fullName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>
      </View>

      {/* Profile Card */}
      <TouchableOpacity
        style={[styles.profileCard, { backgroundColor: colors.background }]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/(protected)/userMenu' as any);
        }}
      >
        <BaseAvatar
          source={avatarUri ? { uri: avatarUri } : undefined}
          fallbackText={fallbackInitial}
          size="lg"
          borderWidth={0}
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
            {fullName || 'User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textMuted }]} numberOfLines={1}>
            {email || 'No email'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('settings.title').toUpperCase()}</Text>

        <View style={[styles.menuGroup, { backgroundColor: colors.background }]}>
          {/* Notifications Toggle */}
          <View style={styles.menuItem}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: notificationsEnabled ? colors.primary : colors.textMuted },
              ]}
            >
              <Ionicons name="notifications" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.notifications')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                {notificationsEnabled ? t('settings.enableNotifications') : t('common.no')}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (value) => {
                if (value) {
                  await requestPermission();
                } else {
                  Alert.alert(
                    'Disable Notifications',
                    'To disable notifications, go to your device Settings > Reticle > Notifications.',
                    [{ text: 'OK' }]
                  );
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Test Notification */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleTestNotification}>
            <View style={[styles.iconContainer, { backgroundColor: colors.textMuted }]}>
              <Ionicons name="notifications-outline" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Test Notification</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Appearance */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowThemeOptions(!showThemeOptions);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="color-palette" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.appearance')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                {THEME_OPTIONS.find((o) => o.value === preference)?.label || t('settings.systemMode')}
              </Text>
            </View>
            <Ionicons name={showThemeOptions ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Theme Options (expandable) */}
          {showThemeOptions && (
            <View style={[styles.themeOptionsContainer, { backgroundColor: colors.secondary }]}>
              {THEME_OPTIONS.map((option) => {
                const isSelected = preference === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.themeOption, isSelected && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPreference(option.value);
                    }}
                  >
                    <View
                      style={[
                        styles.themeOptionIcon,
                        { backgroundColor: isSelected ? colors.primary : colors.textMuted + '30' },
                      ]}
                    >
                      <Ionicons name={option.icon} size={16} color={isSelected ? '#fff' : colors.textMuted} />
                    </View>
                    <Text style={[styles.themeOptionText, { color: isSelected ? colors.primary : colors.text }]}>
                      {option.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Language */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowLanguageOptions(!showLanguageOptions);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="language" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>{t('settings.language')}</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                {LANGUAGE_OPTIONS.find((o) => o.value === language)?.nativeLabel || 'English'}
              </Text>
            </View>
            <Ionicons name={showLanguageOptions ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Language Options (expandable) */}
          {showLanguageOptions && (
            <View style={[styles.themeOptionsContainer, { backgroundColor: colors.secondary }]}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isSelected = language === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.themeOption, isSelected && { backgroundColor: colors.primary + '15' }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setLanguage(option.value);
                    }}
                  >
                    <View
                      style={[
                        styles.themeOptionIcon,
                        { backgroundColor: isSelected ? colors.primary : colors.textMuted + '30' },
                      ]}
                    >
                      <Ionicons name="globe-outline" size={16} color={isSelected ? '#fff' : colors.textMuted} />
                    </View>
                    <Text style={[styles.themeOptionText, { color: isSelected ? colors.primary : colors.text }]}>
                      {option.nativeLabel}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Integrations */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(protected)/integrations' as any);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#22C55E' }]}>
              <Ionicons name="extension-puzzle" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Integrations</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Garmin, Apple Watch</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Audio Shot Detection Demo (iOS only) */}
          {Platform.OS === 'ios' && (
            <>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowAudioDemo(!showAudioDemo);
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: audioListening ? '#EF4444' : '#EC4899' }]}>
                  <Ionicons name="mic" size={18} color="#fff" />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Audio Shot Detection</Text>
                  <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                    {audioListening ? `Listening • ${audioDetectionCount} shots` : 'Test microphone detection'}
                  </Text>
                </View>
                <Ionicons name={showAudioDemo ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Audio Demo Expanded */}
              {showAudioDemo && (
                <View style={[styles.audioDemoContainer, { backgroundColor: colors.secondary }]}>
                  {!audioModuleLoaded ? (
                    // Module not loaded - show rebuild message
                    <View style={styles.audioRebuildMessage}>
                      <Ionicons name="build-outline" size={32} color={colors.textMuted} />
                      <Text style={[styles.audioRebuildTitle, { color: colors.text }]}>Native Rebuild Required</Text>
                      <Text style={[styles.audioRebuildText, { color: colors.textMuted }]}>
                        The audio module requires a native rebuild. Run:
                      </Text>
                      <View style={[styles.audioCodeBlock, { backgroundColor: colors.background }]}>
                        <Text style={[styles.audioCodeText, { color: colors.primary }]}>npx expo run:ios</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      {/* Status indicator */}
                      <View style={styles.audioDemoStatus}>
                        <View
                          style={[
                            styles.audioStatusDot,
                            { backgroundColor: audioListening ? '#22C55E' : colors.textMuted },
                          ]}
                        />
                        <Text style={[styles.audioStatusText, { color: colors.text }]}>
                          {audioListening ? 'Listening for shots...' : 'Not listening'}
                        </Text>
                      </View>

                      {/* Shot counter */}
                      <View style={[styles.audioCounterBox, { backgroundColor: colors.background }]}>
                        <Text style={[styles.audioCounterNumber, { color: colors.primary }]}>{audioDetectionCount}</Text>
                        <Text style={[styles.audioCounterLabel, { color: colors.textMuted }]}>Shots Detected</Text>
                        {lastDetection && (
                          <Text style={[styles.audioLastDetection, { color: colors.textMuted }]}>
                            Last: {Math.round(lastDetection.confidence * 100)}% confidence
                          </Text>
                        )}
                      </View>

                      {/* Controls */}
                      <View style={styles.audioDemoControls}>
                        <TouchableOpacity
                          style={[
                            styles.audioDemoButton,
                            { backgroundColor: audioListening ? '#EF4444' : colors.primary },
                          ]}
                          onPress={handleToggleAudio}
                        >
                          <Ionicons name={audioListening ? 'stop' : 'play'} size={18} color="#fff" />
                          <Text style={styles.audioDemoButtonText}>{audioListening ? 'Stop' : 'Start'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.audioDemoButton, { backgroundColor: colors.textMuted }]}
                          onPress={handleResetAudio}
                        >
                          <Ionicons name="refresh" size={18} color="#fff" />
                          <Text style={styles.audioDemoButtonText}>Reset</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Instructions */}
                      <Text style={[styles.audioDemoHint, { color: colors.textMuted }]}>
                        Clap or snap to test detection. Adjusts automatically for gunshots during sessions.
                      </Text>
                    </>
                  )}
                </View>
              )}
            </>
          )}

          {/* Help & Support */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="help-circle" size={18} color="#fff" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <View style={[styles.menuGroup, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
          <View style={[styles.iconContainer, { backgroundColor: colors.destructive }]}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
          </View>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemText, { color: colors.destructive }]}>{t('auth.signOut')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, { color: colors.textMuted }]}>Reticle v1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 15,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  // Menu
  menuGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  menuItemText: {
    fontSize: 17,
  },
  menuItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 12,
  },

  // Theme Options
  themeOptionsContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  themeOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  // Audio Demo
  audioDemoContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  audioDemoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  audioStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  audioCounterBox: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  audioCounterNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  audioCounterLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  audioLastDetection: {
    fontSize: 12,
    marginTop: 8,
  },
  audioDemoControls: {
    flexDirection: 'row',
    gap: 12,
  },
  audioDemoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  audioDemoButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  audioDemoHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  audioRebuildMessage: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  audioRebuildTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  audioRebuildText: {
    fontSize: 14,
    textAlign: 'center',
  },
  audioCodeBlock: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  audioCodeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
});
