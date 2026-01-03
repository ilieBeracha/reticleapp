# Shot Detection Calibration System

> **For:** Watch App Developer & Mobile App Developer  
> **Updated:** January 2025

---

## Overview

Different firearms produce vastly different recoil signatures. The Garmin watch uses accelerometer data to detect shots, but a fixed threshold doesn't work across all firearms.

### The Problem

| Firearm Type | Typical G-Force at Wrist |
|--------------|--------------------------|
| .22 LR pistol | 1.5 - 3G |
| 9mm pistol | 3 - 5G |
| .45 ACP | 5 - 8G |
| 5.56 rifle (AR-15) | 4 - 8G |
| 7.62x51 rifle | 6 - 12G |
| 12ga shotgun | 10 - 20G |

**A fixed 3.5G threshold will:**
- ❌ Miss many .22 LR shots
- ❌ Miss suppressed rifle shots
- ❌ Double-count heavy recoiling firearms
- ❌ False-positive from arm movement

---

## Solution: Weapon-Aware Detection

The phone app now sends an enhanced `detection` config in SESSION_START:

```json
{
  "type": "SESSION_START",
  "payload": {
    // ... existing fields ...
    
    "detection": {
      "sensitivity": 3.2,      // Primary G-force threshold
      "minThreshold": 1.6,     // Reject peaks below this (false positive rejection)
      "maxThreshold": 9.6,     // Expected max peak for normalization
      "cooldownMs": 80,        // Minimum time between detected shots
      "profile": "handgun"     // "handgun" | "rifle" | "shotgun"
    },
    
    // Legacy (kept for backwards compat)
    "sensitivity": 3.2
  }
}
```

---

## How Sensitivity is Derived

### Priority Order

1. **User's custom calibrated value** (if saved for this weapon)
2. **Caliber-specific lookup** (from known caliber database)
3. **Weapon category default** (pistol=3.5, rifle=4.0, shotgun=5.0)

### Modifiers Applied

| Modifier | Effect | Reason |
|----------|--------|--------|
| Suppressor | -30% sensitivity | Reduces felt impulse duration |
| Muzzle brake | -40% sensitivity | Redirects gases, reduces felt recoil |

### Example Derivation

```
Weapon: 9mm pistol with suppressor
├── Base caliber (9mm): 3.2G
├── Suppressor modifier: × 0.7
└── Final sensitivity: 2.24G (rounded to 2.2G)
```

---

## Watch-Side Detection Algorithm

### Required Implementation

```javascript
class ShotDetector {
    // Config from SESSION_START
    var _sensitivity;
    var _minThreshold;
    var _maxThreshold;
    var _cooldownMs;
    var _profile;
    
    // Runtime state
    var _lastShotTime = 0;
    var _adaptiveThreshold;     // Learned from first shots
    var _recentPeaks = [];      // Last 5 detected peaks
    
    function initialize(config) {
        _sensitivity = config.sensitivity;
        _minThreshold = config.minThreshold;
        _maxThreshold = config.maxThreshold;
        _cooldownMs = config.cooldownMs;
        _profile = config.profile;
        
        // Start with phone-provided threshold
        _adaptiveThreshold = _sensitivity;
        _recentPeaks = [];
    }
    
    function onAccelerometerReading(x, y, z) {
        var now = System.getTimer();
        
        // 1. Calculate magnitude
        var magnitude = Math.sqrt(x*x + y*y + z*z);
        
        // 2. Cooldown check - prevent double-counting
        if (now - _lastShotTime < _cooldownMs) {
            return false;
        }
        
        // 3. Below minimum - definitely not a shot
        if (magnitude < _minThreshold) {
            return false;
        }
        
        // 4. Detection check
        if (magnitude >= _adaptiveThreshold) {
            // 5. Validate it's a real shot (not arm movement)
            if (!validateShotSignature(x, y, z, magnitude)) {
                return false;
            }
            
            // 6. Record shot
            _lastShotTime = now;
            _recentPeaks.add(magnitude);
            
            // 7. Adapt threshold based on actual recoil
            updateAdaptiveThreshold();
            
            return true; // Shot detected!
        }
        
        return false;
    }
    
    function validateShotSignature(x, y, z, magnitude) {
        // Real shots have specific characteristics:
        
        // 1. Mostly vertical component (recoil goes UP)
        var verticalRatio = Math.abs(y) / magnitude;
        if (verticalRatio < 0.4) {
            return false; // Horizontal movement, not a shot
        }
        
        // 2. Fast rise time (< 10ms from rest to peak)
        // This requires tracking previous samples
        // Arm swings have slow rise times (100ms+)
        
        // 3. Profile-specific validation
        if (_profile.equals("shotgun")) {
            // Shotgun has longer impulse duration
            // May need to track for 50-100ms to confirm
        }
        
        return true;
    }
    
    function updateAdaptiveThreshold() {
        // Trim to last 5 peaks
        if (_recentPeaks.size() > 5) {
            _recentPeaks = _recentPeaks.slice(-5);
        }
        
        if (_recentPeaks.size() < 2) {
            return; // Not enough data to adapt
        }
        
        // Calculate median of recent peaks
        var sorted = _recentPeaks.sort();
        var median = sorted[sorted.size() / 2];
        
        // Set threshold at 60% of median (allows for shot variation)
        var newThreshold = median * 0.6;
        
        // Clamp to reasonable range
        newThreshold = Math.max(_minThreshold, newThreshold);
        newThreshold = Math.min(_sensitivity * 1.5, newThreshold);
        
        _adaptiveThreshold = newThreshold;
        
        System.println("Adaptive threshold updated: " + _adaptiveThreshold);
    }
}
```

### Profile-Specific Behavior

| Profile | Impulse Duration | Peak Width | Cooldown |
|---------|-----------------|------------|----------|
| handgun | 30ms | 15ms | 60ms |
| rifle | 50ms | 25ms | 80ms |
| shotgun | 80ms | 40ms | 120ms |

---

## Mobile App Implementation

### Files Modified

| File | Purpose |
|------|---------|
| `utils/detectionSensitivity.ts` | Caliber database, derivation logic |
| `components/session/SensitivitySelector.tsx` | UI for preset selection + slider |
| `components/session/activeSession/activeSession.helpers.ts` | Payload builder with detection config |

### Garmin Watch Files Modified

| File | Purpose |
|------|---------|
| `source/ShotDetector.mc` | Enhanced with DetectionConfig, adaptive threshold, signature validation |
| `source/reticccView.mc` | Parses detection config from SESSION_START payload |
| `source/SessionManager.mc` | Stores detection config for session metadata |

### Using the Sensitivity Selector

```tsx
import { SensitivitySelector } from '@/components/session/SensitivitySelector';
import { useState } from 'react';

function SessionSetupScreen({ weapon }) {
  const [sensitivity, setSensitivity] = useState(3.5);
  
  return (
    <SensitivitySelector
      value={sensitivity}
      onChange={setSensitivity}
      weaponCategory={weapon?.category}
      caliber={weapon?.caliber}
      hasSuppressor={weapon?.has_suppressor}
    />
  );
}
```

### Building Watch Payload with Weapon Info

```tsx
import { buildWatchSessionPayload } from '@/components/session/activeSession/activeSession.helpers';

// New way - weapon-aware
const payload = buildWatchSessionPayload(session, {
  weapon: {
    category: 'pistol',
    caliber: '9mm',
    has_suppressor: true,
  },
  vrcv: true,  // Vibrate on detection
});

// Legacy way (still works)
const legacyPayload = buildWatchSessionPayload(session, {
  sensitivity: 3.5,  // Manual override
});
```

---

## Testing Checklist

### False Positive Tests

| Test | Expected |
|------|----------|
| Wave arm vigorously | No shots detected |
| Hard tap on watch face | No shots detected |
| Walk briskly | No shots detected |
| Run | No shots detected |

### Detection Tests

| Test | Expected |
|------|----------|
| Single shot | Exactly 1 count |
| Rapid fire (3 in 2s) | Exactly 3 counts |
| Heavy recoil (.45) | 1 count, no double |
| Light recoil (.22) | Detection works |

### Adaptive Tests

| Test | Expected |
|------|----------|
| First 3 shots calibration | Threshold adjusts |
| Mix of fast/slow splits | All detected |
| Session with 50+ shots | No drift |

---

## Troubleshooting

### Shots Not Detected

1. **Check sensitivity is not too high**
   - .22 LR needs ~2.0G, not 3.5G
   
2. **Check suppressor modifier is applied**
   - Suppressed 9mm drops from 3.2G to 2.2G

3. **Check cooldown isn't too long**
   - Fast splits (0.15s) need 80ms cooldown max

### Double-Counting Shots

1. **Check cooldown is long enough**
   - Heavy recoil may oscillate for 100ms+
   
2. **Check threshold isn't too low**
   - Aftershock may exceed low threshold

3. **Validate vertical component**
   - Real shots are mostly vertical

### False Positives (Arm Movement)

1. **Check minThreshold is set**
   - Should be ~50% of sensitivity
   
2. **Validate rise time**
   - Real shots rise in <10ms
   - Arm swings take 100ms+

---

## Caliber Database

The full caliber database is in `utils/detectionSensitivity.ts`. Key entries:

```typescript
const CALIBER_SENSITIVITY_MAP = {
  // Rimfire
  '.22 LR': 2.0,
  
  // Light Pistol
  '.380 ACP': 2.5,
  
  // Medium Pistol
  '9mm': 3.2,
  
  // Heavy Pistol
  '.45 ACP': 4.2,
  '.357 Magnum': 4.5,
  
  // Light Rifle
  '5.56x45': 3.5,
  '.300 BLK': 3.0,
  
  // Heavy Rifle
  '7.62x51': 4.5,
  '.308 Win': 4.5,
  
  // Shotgun
  '12 Gauge': 5.5,
  '20 Gauge': 4.5,
};
```

---

## Future Enhancements

1. **Per-Weapon Calibration Storage**
   - Store learned threshold per weapon ID
   - "Calibrate" button fires 3 shots, learns pattern

2. **ML-Based Detection**
   - Train model on real shot signatures
   - Classify shot vs. not-shot

3. **Recoil Fingerprinting**
   - Each gun has unique recoil signature
   - Auto-identify which weapon is being used

---

*Document Version: 1.0*  
*Last Updated: January 2025*

