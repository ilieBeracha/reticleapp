/**
 * Dynamic Expo Configuration
 * 
 * Supports multiple app variants that can be installed simultaneously:
 * - development: Local dev server, includes expo-dev-client
 * - preview: Internal testing, receives OTA updates from preview branch
 * - production: App Store / Play Store release
 * 
 * Usage:
 *   eas build --profile development --platform ios
 *   eas build --profile preview --platform ios
 *   eas build --profile production --platform ios
 */

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

// Determine app name suffix and bundle identifier suffix
const getAppName = () => {
  if (IS_DEV) return 'Retic (Dev)';
  if (IS_PREVIEW) return 'Retic';
  return 'Retic';
};

const getBundleIdentifier = () => {
  if (IS_DEV) return 'com.retic.app.development';
  if (IS_PREVIEW) return 'com.retic.app';
  return 'com.reticled.app';
};

const getAndroidPackage = () => {
  if (IS_DEV) return 'com.retic.app.development';
  if (IS_PREVIEW) return 'com.retic.app';
  return 'com.reticled.app';
};

const getScheme = () => {
  if (IS_DEV) return 'retic-dev';
  if (IS_PREVIEW) return 'retic';
  // Must be lowercase and match: ^[a-z][a-z0-9+.-]*$
  return 'reticled';
};

export default ({ config }) => {
  return {
    ...config,
    name: getAppName(),
    slug: 'retic',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.jpg',
    scheme: getScheme(),
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/icon.jpg',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    newArchEnabled: true,
    ios: {
      bundleIdentifier: getBundleIdentifier(),
      supportsTablet: true,
      icon: './assets/images/icon.jpg',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      versionCode: 5,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/icon.jpg',
        backgroundImage: './assets/images/icon.jpg',
        monochromeImage: './assets/images/icon.jpg',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getAndroidPackage(),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
    },
    web: {
      output: 'single',
      favicon: './assets/images/icon.jpg',
    },
    plugins: [
      "expo-build-properties",
      "expo-secure-store",
      "expo-web-browser",
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Allow $(PRODUCT_NAME) to use Face ID.',
        },
      ],
      [
        'expo-sensors',
        {
          motionPermission: 'Allow $(PRODUCT_NAME) to access your device motion',
        },
      ],
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.jpg',
          imageWidth: 200,
          resizeMode: 'cover',
          backgroundColor: '#221f20',
          dark: {
            backgroundColor: '#221f20',
          },
        },
      ],
      ['react-native-bottom-tabs'],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: true,
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'retic',
          organization: 'reticle',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.jpg',
          color: '#FF6B35',
          sounds: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      owner: 'ilieberacha',
      eas: {
        router: {},
        projectId: 'a6389fa6-2be9-4cf2-803c-58ceab564997',
      },
      router: {},
      // Expose variant to app code if needed
      appVariant: process.env.APP_VARIANT || 'production',
    },
    owner: 'ilieberacha',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/a6389fa6-2be9-4cf2-803c-58ceab564997',
    },
  };
};
