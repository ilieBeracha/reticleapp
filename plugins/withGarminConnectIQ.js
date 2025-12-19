const { withInfoPlist, withXcodeProject, withAppDelegate } = require('@expo/config-plugins');

const withGarminConnectIQ = (config) => {
  // Get the URL scheme from config (defaults to 'retic')
  const urlScheme = config.scheme || 'retic';

  // 1. Add Info.plist entries
  config = withInfoPlist(config, (config) => {
    // Required for querying if Garmin Connect Mobile is installed
    config.modResults.LSApplicationQueriesSchemes = [
      ...(config.modResults.LSApplicationQueriesSchemes || []),
      'gcm-ciq'
    ];
    
    // Required by Garmin SDK
    config.modResults.CFBundleDisplayName = '${PRODUCT_NAME}';
    config.modResults.NSBluetoothPeripheralUsageDescription = 
      'This app needs Bluetooth to communicate with your Garmin device';
    
    // Add background modes for Bluetooth
    config.modResults.UIBackgroundModes = [
      ...(config.modResults.UIBackgroundModes || []),
      'bluetooth-central'
    ];
    
    return config;
  });

  // 2. Add -ObjC linker flag (required for category methods in ConnectIQ)
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildSettings = configurations[key]?.buildSettings;
      if (!buildSettings) continue;
      
      // Note: Both values MUST be double-quoted for pbxproj format
      if (!buildSettings.OTHER_LDFLAGS) {
        buildSettings.OTHER_LDFLAGS = ['"$(inherited)"', '"-ObjC"'];
      } else if (Array.isArray(buildSettings.OTHER_LDFLAGS)) {
        const hasObjC = buildSettings.OTHER_LDFLAGS.some(flag => 
          flag === '"-ObjC"' || flag === '-ObjC'
        );
        if (!hasObjC) {
          buildSettings.OTHER_LDFLAGS.push('"-ObjC"');
        }
      } else if (typeof buildSettings.OTHER_LDFLAGS === 'string') {
        buildSettings.OTHER_LDFLAGS = [
          buildSettings.OTHER_LDFLAGS,
          '"-ObjC"'
        ];
      }
    }
    
    return config;
  });

  // 3. Modify AppDelegate to initialize ConnectIQ and handle URL callbacks
  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    
    // Add ConnectIQ import if not present
    if (!contents.includes('import ConnectIQ')) {
      contents = contents.replace(
        'import Expo',
        'import Expo\nimport ConnectIQ'
      );
    }

    // Add SDK initialization in didFinishLaunchingWithOptions
    const initCode = `
    // Initialize Garmin ConnectIQ SDK
    ConnectIQ.sharedInstance()?.initialize(withUrlScheme: "${urlScheme}", uiOverrideDelegate: nil)
`;
    
    if (!contents.includes('ConnectIQ.sharedInstance()?.initialize')) {
      // Insert after super.application call in didFinishLaunchingWithOptions
      contents = contents.replace(
        'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        `${initCode}
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
      );
    }

    // Add URL handling for Garmin device selection response
    const urlHandlerCode = `
    // Handle Garmin Connect device selection response
    if url.scheme == "${urlScheme}" {
      if let devices = ConnectIQ.sharedInstance()?.parseDeviceSelectionResponse(from: url) {
        NotificationCenter.default.post(
          name: NSNotification.Name("GarminDevicesReceived"),
          object: nil,
          userInfo: ["devices": devices]
        )
        return true
      }
    }
`;

    // Find the open URL method and add Garmin handling
    if (!contents.includes('parseDeviceSelectionResponse')) {
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

module.exports = withGarminConnectIQ;
