const { withInfoPlist } = require('expo/config-plugins');

/**
 * Expo config plugin to add microphone usage description for iOS
 * Required for audio-based shot detection
 */
const withMicrophonePermission = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.NSMicrophoneUsageDescription =
      'Reticle uses the microphone to detect gunshots during training sessions.';
    return config;
  });
};

module.exports = withMicrophonePermission;
