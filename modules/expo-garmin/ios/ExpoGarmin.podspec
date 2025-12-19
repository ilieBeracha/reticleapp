Pod::Spec.new do |s|
  s.name           = 'ExpoGarmin'
  s.version        = '1.0.0'
  s.summary        = 'Garmin ConnectIQ for Expo'
  s.description    = 'Expo module for Garmin ConnectIQ SDK'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "*.swift"
  s.vendored_frameworks = "ConnectIQ.xcframework"
end