import AVFoundation
import ExpoModulesCore

public class ShotAudioModule: Module {
    private let engine = AVAudioEngine()
    private var isRunning = false
    private var lastDetectionTime: UInt64 = 0
    
    // Tunable parameters (can be updated via setConfig)
    // Ultra-low thresholds for testing - any sound should trigger
    private var bufferSize: AVAudioFrameCount = 1024
    private var energyThreshold: Float = 0.001  // Ultra sensitive
    private var riseThreshold: Float = 0.002    // Ultra sensitive
    private var cooldownMs: UInt64 = 300
    
    // For time conversion
    private var timebaseInfo = mach_timebase_info_data_t()
    
    public func definition() -> ModuleDefinition {
        Name("ShotAudio")
        
        Events("onShotDetected", "onDebugLog", "onStatusChange")
        
        Function("start") {
            self.startAudio()
        }
        
        Function("stop") {
            self.stopAudio()
        }
        
        Function("isAvailable") { () -> Bool in
            return AVAudioSession.sharedInstance().isInputAvailable
        }
        
        Function("setConfig") { (energy: Float, rise: Float, cooldown: Int) in
            self.energyThreshold = energy
            self.riseThreshold = rise
            self.cooldownMs = UInt64(cooldown)
        }
    }
    
    private func startAudio() {
        guard !isRunning else {
            sendEvent("onStatusChange", ["status": "already_running"])
            return
        }

        sendEvent("onStatusChange", ["status": "starting"])

        // Get timebase info for accurate timing
        if timebaseInfo.denom == 0 {
            mach_timebase_info(&timebaseInfo)
        }

        let session = AVAudioSession.sharedInstance()

        // Check and request microphone permission
        switch session.recordPermission {
        case .undetermined:
            sendEvent("onStatusChange", ["status": "requesting_permission"])
            session.requestRecordPermission { [weak self] granted in
                if granted {
                    self?.sendEvent("onStatusChange", ["status": "permission_granted"])
                    DispatchQueue.main.async {
                        self?.configureAndStartEngine()
                    }
                } else {
                    self?.sendEvent("onStatusChange", ["status": "permission_denied"])
                }
            }
            return
        case .denied:
            sendEvent("onStatusChange", ["status": "permission_denied_settings"])
            return
        case .granted:
            sendEvent("onStatusChange", ["status": "permission_ok"])
        @unknown default:
            sendEvent("onStatusChange", ["status": "permission_unknown"])
            return
        }

        configureAndStartEngine()
    }

    private func configureAndStartEngine() {
        sendEvent("onStatusChange", ["status": "configuring_session"])

        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.mixWithOthers, .defaultToSpeaker])
            try session.setActive(true)
        } catch {
            sendEvent("onStatusChange", ["status": "session_error", "error": "\(error)"])
            return
        }

        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)

        // Validate format before installing tap
        guard format.sampleRate > 0 && format.channelCount > 0 else {
            sendEvent("onStatusChange", ["status": "invalid_format", "sampleRate": format.sampleRate, "channels": format.channelCount])
            return
        }

        sendEvent("onStatusChange", ["status": "format_ok", "sampleRate": format.sampleRate, "channels": format.channelCount])

        // Remove any existing tap before installing a new one (safe even if none exists)
        input.removeTap(onBus: 0)

        input.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] buffer, time in
            self?.processBuffer(buffer, time: time)
        }

        do {
            try engine.start()
            isRunning = true
            sendEvent("onStatusChange", ["status": "engine_started"])
        } catch {
            sendEvent("onStatusChange", ["status": "engine_error", "error": "\(error)"])
        }
    }
    
    private func stopAudio() {
        guard isRunning else { return }

        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isRunning = false
        frameCount = 0
        print("ShotAudio: Engine stopped")
    }
    
    private var frameCount: Int = 0
    
    private func processBuffer(_ buffer: AVAudioPCMBuffer, time: AVAudioTime) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        
        let frameLength = Int(buffer.frameLength)
        var energy: Float = 0
        var peak: Float = 0
        
        // Calculate RMS energy and peak amplitude
        for i in 0..<frameLength {
            let sample = abs(channelData[i])
            energy += sample * sample
            peak = max(peak, sample)
        }
        
        energy = sqrt(energy / Float(frameLength)) // RMS
        
        // Debug: log every 100 frames to see audio levels
        frameCount += 1
        if frameCount % 100 == 0 {
            sendEvent("onDebugLog", [
                "frame": frameCount,
                "energy": energy,
                "peak": peak,
                "energyThreshold": energyThreshold,
                "riseThreshold": riseThreshold
            ])
        }
        
        // Simple impulse heuristic: high energy + sharp peak
        if energy > energyThreshold && peak > riseThreshold {
            let currentTime = mach_absolute_time()
            let elapsedNs = (currentTime - lastDetectionTime) * UInt64(timebaseInfo.numer) / UInt64(timebaseInfo.denom)
            let elapsedMs = elapsedNs / 1_000_000
            
            // Apply cooldown to prevent double-detection
            if elapsedMs >= cooldownMs || lastDetectionTime == 0 {
                lastDetectionTime = currentTime
                
                // Calculate confidence based on how much thresholds were exceeded
                let energyRatio = min(energy / energyThreshold, 5.0) / 5.0
                let peakRatio = min(peak / riseThreshold, 5.0) / 5.0
                let confidence = (energyRatio + peakRatio) / 2.0
                
                sendEvent("onShotDetected", [
                    "timestamp": Date().timeIntervalSince1970 * 1000,
                    "confidence": confidence,
                    "peakEnergy": peak
                ])
                
                print("ShotAudio: Shot detected! confidence=\(confidence), energy=\(energy), peak=\(peak)")
            }
        }
    }
}
