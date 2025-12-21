const { withInfoPlist, withAppDelegate, withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to set up Garmin Connect URL handling for react-native-garmin-connect
 */
const withGarminUrlHandler = (config) => {
  const urlScheme = config.scheme || 'retic';

  // 0. Add -ObjC linker flag and header search paths for ConnectIQ
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    for (const key in configurations) {
      const buildSettings = configurations[key]?.buildSettings;
      if (!buildSettings) continue;
      
      // Add -ObjC linker flag
      if (!buildSettings.OTHER_LDFLAGS) {
        buildSettings.OTHER_LDFLAGS = ['"$(inherited)"', '"-ObjC"'];
      } else if (Array.isArray(buildSettings.OTHER_LDFLAGS)) {
        const hasObjC = buildSettings.OTHER_LDFLAGS.some(flag => 
          flag === '"-ObjC"' || flag === '-ObjC'
        );
        if (!hasObjC) {
          buildSettings.OTHER_LDFLAGS.push('"-ObjC"');
        }
      }
    }
    
    return config;
  });

  // 1. Modify Podfile to fix ConnectIQ header search paths
  config = withDangerousMod(config, ['ios', async (config) => {
    const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    let podfileContent = fs.readFileSync(podfilePath, 'utf8');
    
    // Add header search path fix for react-native-garmin-connect in post_install
    const garminHeaderFix = `
    # Fix ConnectIQ header search paths for react-native-garmin-connect
    installer.pods_project.targets.each do |target|
      if target.name == 'react-native-garmin-connect'
        target.build_configurations.each do |config|
          # Add path to ConnectIQ.xcframework headers
          garmin_path = "\${PODS_ROOT}/../../node_modules/react-native-garmin-connect/ios/ConnectIQ.xcframework/ios-arm64/ConnectIQ.framework/Headers"
          garmin_sim_path = "\${PODS_ROOT}/../../node_modules/react-native-garmin-connect/ios/ConnectIQ.xcframework/ios-arm64_x86_64-simulator/ConnectIQ.framework/Headers"
          existing = config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
          config.build_settings['HEADER_SEARCH_PATHS'] = "#{existing} \"#{garmin_path}\" \"#{garmin_sim_path}\""
        end
      end
    end`;
    
    // Insert the fix into the post_install block
    if (!podfileContent.includes('Fix ConnectIQ header search paths')) {
      podfileContent = podfileContent.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|${garminHeaderFix}`
      );
      fs.writeFileSync(podfilePath, podfileContent);
    }
    
    return config;
  }]);

  // 2. Add Info.plist entries for Garmin Connect
  config = withInfoPlist(config, (config) => {
    // Required for querying if Garmin Connect Mobile is installed
    config.modResults.LSApplicationQueriesSchemes = [
      ...(config.modResults.LSApplicationQueriesSchemes || []),
      'gcm-ciq'
    ];
    
    // Required for Bluetooth
    config.modResults.NSBluetoothPeripheralUsageDescription = 
      config.modResults.NSBluetoothPeripheralUsageDescription ||
      'This app needs Bluetooth to communicate with your Garmin device';
    
    return config;
  });

  // 2. Modify AppDelegate to handle URL callbacks from Garmin Connect
  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    
    // Add import for GarminDeviceStorage if not present
    if (!contents.includes('import react_native_garmin_connect')) {
      contents = contents.replace(
        'import Expo',
        'import Expo\nimport react_native_garmin_connect'
      );
    }

    // Add URL handling for Garmin device selection response
    // Always call the Garmin handler for our scheme - it will check if valid
    // Then let expo-router also handle it (for the device-select-resp route)
    const urlHandlerCode = `
    // Handle Garmin Connect device selection response
    // GCM returns to: retic://device-select-resp?...
    if url.scheme == "${urlScheme}" {
      print("[Garmin] URL received: \\(url.absoluteString)")
      GarminDeviceStorage.onDevicesReceived(open: url)
      // Don't return - let expo-router also handle for the route
    }
`;

    // Find the open URL method and add Garmin handling
    if (!contents.includes('GarminDeviceStorage.onDevicesReceived')) {
      contents = contents.replace(
        /public override func application\(\s*_ app: UIApplication,\s*open url: URL,\s*options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s*\) -> Bool \{/,
        `public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
${urlHandlerCode}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withGarminUrlHandler;
