Overview

Add a real-time audio shot detection module using  
 AVAudioEngine that complements the existing Garmin watch  
 accelerometer detection.

---

Complete Implementation Files

---

1.  modules/shot-audio/package.json  


{  
 "name": "shot-audio",  
 "version": "1.0.0",  
 "main": "index.ts",  
 "types": "index.ts",  
 "scripts": {},  
 "peerDependencies": {  
 "expo": "\*"  
 }  
 }

---

2.  modules/shot-audio/expo-module.config.json  


{  
 "platforms": ["ios"],  
 "ios": {  
 "modules": ["ShotAudioModule"]  
 }  
 }

---

3.  modules/shot-audio/index.ts  


import ShotAudioModule from './src/ShotAudioModule';

export { ShotAudioModule };  
 export \* from './src/ShotAudio.types';  
 export { startShotAudio, stopShotAudio, onShotDetected,  
 isAvailable, setConfig } from './src/ShotAudioModule';

---

4.  modules/shot-audio/src/ShotAudio.types.ts  


export interface ShotDetectionEvent {  
 timestamp: number;  
 confidence: number;  
 peakEnergy: number;  
 source: 'audio';  
 }

export interface AudioDetectionConfig {  
 energyThreshold?: number;  
 riseThreshold?: number;  
 cooldownMs?: number;  
 }

export type ShotDetectionListener = (event:  
 ShotDetectionEvent) => void;

---

5.  modules/shot-audio/src/ShotAudioModule.ts  


import { NativeModulesProxy, EventEmitter, Subscription }
from 'expo-modules-core';  
 import { ShotDetectionEvent, AudioDetectionConfig,  
 ShotDetectionListener } from './ShotAudio.types';

const ShotAudio = NativeModulesProxy.ShotAudio;  
 const emitter = new EventEmitter(ShotAudio);

export function startShotAudio(): void {  
 ShotAudio.start();  
 }

export function stopShotAudio(): void {  
 ShotAudio.stop();  
 }

export function isAvailable(): boolean {  
 return ShotAudio.isAvailable();  
 }

export function setConfig(config: AudioDetectionConfig):  
 void {  
 ShotAudio.setConfig(  
 config.energyThreshold ?? 0.02,  
 config.riseThreshold ?? 0.015,  
 config.cooldownMs ?? 200  
 );  
 }

export function onShotDetected(listener:  
 ShotDetectionListener): Subscription {  
 return emitter.addListener('onShotDetected', (event) =>
{  
 listener({  
 ...event,  
 source: 'audio',  
 });  
 });  
 }

export default {  
 startShotAudio,  
 stopShotAudio,  
 isAvailable,  
 setConfig,  
 onShotDetected,  
 };

---

6.  modules/shot-audio/ios/ShotAudio.podspec  


require 'json'

package = JSON.parse(File.read(File.join(**dir**, '..',  
 'package.json')))

Pod::Spec.new do |s|  
 s.name = 'ShotAudio'  
 s.version = package['version']  
 s.summary = 'Audio shot detection for Reticle'  
 s.description = 'Real-time audio impulse detection  
 for shot counting'  
 s.license = 'MIT'  
 s.author = 'Reticle'  
 s.homepage = 'https://reticle.app'  
 s.platforms = { ios: '15.0' }  
 s.swift_version = '5.4'  
 s.source = { git: '' }  
 s.static_framework = true  
 s.source_files = '\*_/_.swift'  
 s.dependency 'ExpoModulesCore'  
 end

---

7.  modules/shot-audio/ios/ShotAudioModule.swift  


import AVFoundation  
 import ExpoModulesCore

public class ShotAudioModule: Module {  
 private let engine = AVAudioEngine()  
 private var isRunning = false  
 private var lastDetectionTime: UInt64 = 0

// Tunable parameters (can be updated via setConfig)  
 private var bufferSize: AVAudioFrameCount = 1024  
 private var energyThreshold: Float = 0.02  
 private var riseThreshold: Float = 0.015  
 private var cooldownMs: UInt64 = 200

public func definition() -> ModuleDefinition {  
 Name("ShotAudio")

     Events("onShotDetected")

     Function("start") {
       self.startAudio()
     }

     Function("stop") {
       self.stopAudio()
     }

     Function("isAvailable") { () -> Bool in
       return

AVAudioSession.sharedInstance().isInputAvailable  
 }

     Function("setConfig") { (energy: Float, rise: Float,

cooldown: Int) in  
 self.energyThreshold = energy  
 self.riseThreshold = rise  
 self.cooldownMs = UInt64(cooldown)  
 }  
 }

private func startAudio() {  
 guard !isRunning else { return }

     let session = AVAudioSession.sharedInstance()
     do {
       try session.setCategory(.playAndRecord, mode:

.measurement, options: [.mixWithOthers,
 .defaultToSpeaker])  
 try session.setActive(true)  
 } catch {  
 print("ShotAudio: Failed to configure audio  
 session: \(error)")  
 return  
 }

     let input = engine.inputNode
     let format = input.outputFormat(forBus: 0)

     input.installTap(onBus: 0, bufferSize: bufferSize,

format: format) { [weak self] buffer, time in  
 self?.processBuffer(buffer, time: time)  
 }

     do {
       try engine.start()
       isRunning = true
     } catch {
       print("ShotAudio: Failed to start engine:

\(error)")  
 }  
 }

private func stopAudio() {  
 guard isRunning else { return }

     engine.inputNode.removeTap(onBus: 0)
     engine.stop()
     isRunning = false

}

private func processBuffer(\_ buffer: AVAudioPCMBuffer,  
 time: AVAudioTime) {  
 guard let channelData = buffer.floatChannelData?[0]  
 else { return }

     let frameLength = Int(buffer.frameLength)
     var energy: Float = 0
     var peak: Float = 0

     for i in 0..<frameLength {
       let sample = abs(channelData[i])
       energy += sample * sample
       peak = max(peak, sample)
     }

     energy /= Float(frameLength)

     // Simple impulse heuristic
     if energy > energyThreshold && peak > riseThreshold {
       let currentTime = mach_absolute_time()
       let elapsedMs = (currentTime - lastDetectionTime) /

1_000_000

       // Apply cooldown to prevent double-detection
       if elapsedMs >= cooldownMs {
         lastDetectionTime = currentTime

         let confidence = min(1.0, (energy /

energyThreshold + peak / riseThreshold) / 2.0)

         sendEvent("onShotDetected", [
           "timestamp": Date().timeIntervalSince1970 *

1000,  
 "confidence": confidence,  
 "peakEnergy": peak  
 ])  
 }  
 }  
 }  
 }

---

8.  plugins/withMicrophonePermission.js  


const { withInfoPlist } =  
 require('@expo/config-plugins');

const withMicrophonePermission = (config) => {  
 return withInfoPlist(config, (config) => {  
 config.modResults.NSMicrophoneUsageDescription =  
 'Reticle uses the microphone to detect gunshots  
 during training sessions.';  
 return config;  
 });  
 };

module.exports = withMicrophonePermission;

---

9.  store/audioStore.tsx  


import { create } from 'zustand';  
 import { Subscription } from 'expo-modules-core';  
 import {  
 startShotAudio,  
 stopShotAudio,  
 onShotDetected,  
 isAvailable,  
 setConfig,  
 } from '@/modules/shot-audio';  
 import { ShotDetectionEvent, AudioDetectionConfig } from  
 '@/modules/shot-audio';

interface AudioState {  
 // State  
 isListening: boolean;  
 isAvailable: boolean;  
 lastDetection: ShotDetectionEvent | null;  
 detectionCount: number;

// Callback  
 onShotDetected: ((event: ShotDetectionEvent) => void) |
null;

// Actions  
 start: () => void;  
 stop: () => void;  
 setConfig: (config: AudioDetectionConfig) => void;  
 setShotDetectedCallback: (cb: ((e: ShotDetectionEvent)  
 => void) | null) => void;  
 checkAvailability: () => boolean;  
 reset: () => void;  
 }

let subscription: Subscription | null = null;

export const useAudioStore = create<AudioState>((set,  
 get) => ({  
 isListening: false,  
 isAvailable: false,  
 lastDetection: null,  
 detectionCount: 0,  
 onShotDetected: null,

start: () => {  
 if (get().isListening) return;

     // Subscribe to native events
     subscription = onShotDetected((event) => {
       set((state) => ({
         lastDetection: event,
         detectionCount: state.detectionCount + 1,
       }));

       // Call registered callback
       const callback = get().onShotDetected;
       if (callback) {
         callback(event);
       }
     });

     startShotAudio();
     set({ isListening: true });

},

stop: () => {  
 if (!get().isListening) return;

     subscription?.remove();
     subscription = null;

     stopShotAudio();
     set({ isListening: false });

},

setConfig: (config: AudioDetectionConfig) => {  
 setConfig(config);  
 },

setShotDetectedCallback: (cb) => {  
 set({ onShotDetected: cb });  
 },

checkAvailability: () => {  
 const available = isAvailable();  
 set({ isAvailable: available });  
 return available;  
 },

reset: () => {  
 get().stop();  
 set({  
 lastDetection: null,  
 detectionCount: 0,  
 onShotDetected: null,  
 });  
 },  
 }));

---

10. Add to app.config.js plugins array  


plugins: [
 './plugins/strip-bitcode',
 './plugins/withGarminUrlHandler',
 './plugins/withMicrophonePermission', // ADD THIS
 // ... rest of plugins
 ]

---

11. Integration in useActiveSession.ts (add to existing  
    hook)  


// Add import at top  
 import { useAudioStore } from '@/store/audioStore';  
 import \* as Haptics from 'expo-haptics';

// Inside the hook, add:  
 const { start: startAudio, stop: stopAudio,  
 setShotDetectedCallback, isListening } = useAudioStore();

// Add useEffect for audio detection (alongside existing  
 watch logic)  
 useEffect(() => {  
 if (!session?.active ||  
 !session?.audio_detection_enabled) return;

const handleAudioShot = async (event:  
 ShotDetectionEvent) => {  
 // Haptic feedback

Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

     // Create target with audio detection metadata
     await supabase.from('session_targets').insert({
       session_id: session.id,
       target_type: 'tactical',
       distance_m: session.drill?.distance_m || 10,
       target_data: {
         detection_source: 'audio',
         timestamp: event.timestamp,
         confidence: event.confidence,
         peak_energy: event.peakEnergy,
       },
     });

     // Refresh data
     loadData();

};

setShotDetectedCallback(handleAudioShot);  
 startAudio();

return () => {  
 setShotDetectedCallback(null);  
 stopAudio();  
 };  
 }, [session?.active, session?.audio_detection_enabled,
 session?.id]);

---

Directory Structure After Implementation

modules/shot-audio/  
 ├── package.json  
 ├── expo-module.config.json  
 ├── index.ts  
 ├── src/  
 │ ├── ShotAudio.types.ts  
 │ └── ShotAudioModule.ts  
 └── ios/  
 ├── ShotAudio.podspec  
 └── ShotAudioModule.swift

plugins/  
 ├── strip-bitcode.js  
 ├── withGarminUrlHandler.js  
 └── withMicrophonePermission.js # NEW

store/  
 ├── garminStore.tsx  
 └── audioStore.tsx # NEW

---

Verification (After You Run Build)

1.  Fresh install prompts for microphone permission
2.  Clap/snap triggers event with confidence > 0.5
3.  Start session with audio enabled → creates targets  
    automatically
4.  Rapid claps don't double-count (200ms cooldown)
5.  Works alongside Garmin watch when both enabled  
    ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
