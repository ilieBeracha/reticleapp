#!/bin/bash

FRAMEWORK_PATH="node_modules/react-native-garmin-connect/ios/ConnectIQ.xcframework"

echo "Stripping bitcode from ConnectIQ.xcframework..."

# Strip arm64 (device)
if [ -f "$FRAMEWORK_PATH/ios-arm64/ConnectIQ.framework/ConnectIQ" ]; then
  xcrun bitcode_strip -r "$FRAMEWORK_PATH/ios-arm64/ConnectIQ.framework/ConnectIQ" -o "$FRAMEWORK_PATH/ios-arm64/ConnectIQ.framework/ConnectIQ"
  echo "✅ Stripped bitcode from ios-arm64"
fi

# Strip simulator
if [ -f "$FRAMEWORK_PATH/ios-arm64_x86_64-simulator/ConnectIQ.framework/ConnectIQ" ]; then
  xcrun bitcode_strip -r "$FRAMEWORK_PATH/ios-arm64_x86_64-simulator/ConnectIQ.framework/ConnectIQ" -o "$FRAMEWORK_PATH/ios-arm64_x86_64-simulator/ConnectIQ.framework/ConnectIQ"
  echo "✅ Stripped bitcode from simulator"
fi

echo "Done!"