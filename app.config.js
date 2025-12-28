const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
const getAppName = () => {
  if (IS_DEV) return 'Retic (Dev)';
  if (IS_PREVIEW) return 'Retic';
  return 'Reticle';
};
const getBundleIdentifier = () => {
  if (IS_DEV) return 'com.retic.app.development';
  if (IS_PREVIEW) return 'com.retic.app';
  return 'com.reticle.app';
};
const getAndroidPackage = () => {
  if (IS_DEV) return 'com.retic.app.development';
  if (IS_PREVIEW) return 'com.retic.app';
  return 'com.reticle.app';
};

const getScheme = () => {
  if (IS_DEV) return 'retic-dev';
  if (IS_PREVIEW) return 'retic-preview';
  return 'retic';
};


const getSlug = () => {
  // All variants use same slug because they share the same EAS project
  return 'retic';
};
export default ({ config }) => {
  return {
    ...config,
    name: getAppName(),
    slug: getSlug(),
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
      package: getAndroidPackage(),
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
      ],
    },
    plugins: [
      './plugins/withGarminUrlHandler',
      'expo-build-properties',
      'expo-secure-store',
      'expo-web-browser',
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
        projectId: 'a6389fa6-2be9-4cf2-803c-58ceab564997',
      },
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