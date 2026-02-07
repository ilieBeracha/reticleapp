require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ShotAudio'
  s.version        = package['version']
  s.summary        = 'Audio shot detection for Reticle'
  s.description    = 'Real-time audio impulse detection for shot counting using AVAudioEngine'
  s.license        = 'MIT'
  s.author         = 'Reticle'
  s.homepage       = 'https://reticle.app'
  s.platforms      = { ios: '15.0' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true
  s.source_files   = '**/*.swift'
  s.dependency 'ExpoModulesCore'
end
