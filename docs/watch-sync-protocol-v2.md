# Watch Sync Protocol v2

> **For:** Watch App Engineer  
> **Updated:** January 2025  
> **Breaking Change:** SESSION_DETAILS removed, 2-phase sync only

---

## ⚠️ CRITICAL: MESSAGE SIZE LIMITS

**Garmin Connect IQ has a HARD message size limit of ~8KB.**

If you exceed this, `Comm.transmit()` will FAIL silently or throw an error.

### Safe Size Guidelines

| Message Type | Max Size | Safe Target |
|-------------|----------|-------------|
| SESSION_SUMMARY | 8KB | **< 1KB** |
| TIMELINE_CHUNK | 8KB | **< 4KB per chunk** |

### How to Calculate Size

```javascript
// Approximate size calculation
function estimatePayloadSize(payload) {
    var json = payload.toString();  // Serialize to string
    return json.length();           // Character count ≈ bytes
}

// Before sending, ALWAYS check:
var size = estimatePayloadSize(chunk);
System.println("Chunk size: " + size + " bytes");
if (size > 4000) {
    System.println("WARNING: Chunk too large! Reduce points.");
}
```

### Safe Chunking Formula

```javascript
// NEVER exceed these limits:
var MAX_POINTS_PER_CHUNK = 50;      // Not 100! Be conservative
var MAX_SHOTS_IN_LAST_CHUNK = 30;   // Shot details are larger

// Calculate chunks safely:
var totalPoints = _timelinePoints.size();
var chunksNeeded = Math.ceil(totalPoints / MAX_POINTS_PER_CHUNK);
```

---

## Overview

The sync protocol is simplified to **2 phases**:

| Phase | Message Type | Purpose | When Sent |
|-------|--------------|---------|-----------|
| **Phase 1** | `SESSION_SUMMARY` | Instant display + all metadata | Immediately on session end |
| **Phase 2** | `TIMELINE_CHUNK` | Biometric time-series + shot details | After SUMMARY ACK received |

**Removed:** `SESSION_DETAILS` is no longer used.

---

## Phase 1: SESSION_SUMMARY

### Purpose
- Phone shows "Session Recorded" toast immediately
- All session data saved to database
- Must be small enough for instant transmission (~1KB max)

### When to Send
- Immediately when session ends (user presses BACK or max rounds reached)

### Message Format

```javascript
{
  "type": "SESSION_SUMMARY",
  "payload": {
    // === IDENTIFICATION ===
    "sid": "uuid-string",              // Session ID (required)
    
    // === CORE RESULTS ===
    "shots": 10,                       // Total shots fired (required)
    "time": 45.2,                      // Elapsed time in seconds (required)
    "dist": 100,                       // Distance in meters (required)
    "complete": true,                  // true = max rounds reached, false = ended early
    
    // === BIOMETRICS SUMMARY ===
    "bio": {
      "hr": {
        "avg": 85,                     // Average heart rate
        "max": 120,                    // Maximum heart rate
        "min": 65,                     // Minimum heart rate
        "start": 72,                   // HR at session start
        "end": 95                      // HR at session end
      },
      "stress": {
        "avg": 45,                     // Average stress score (0-100)
        "max": 78,                     // Maximum stress
        "min": 25                      // Minimum stress
      },
      "breath": {
        "avg": 16                      // Average breath rate (breaths/min)
      }
    },
    
    // === DETECTION METADATA ===
    "detection": {
      "auto": true,                    // Was auto-detection enabled?
      "sens": 3.5,                     // Detection sensitivity (1-5)
      "overrides": 2                   // Manual shot count overrides by user
    },
    
    // === STEADINESS METRICS ===
    "steady": {
      "avg": 75,                       // Average steadiness score (0-100)
      "shots": 68                      // Steadiness at shot moments
    },
    
    // === PERFORMANCE METRICS ===
    "perf": {
      "first": 1250,                   // Time to first shot (ms)
      "splits": [850, 920, 780, 900],  // Split times between shots (ms) - max 20
      "avgSplit": 862,                 // Average split time (ms)
      "spm": 70                        // Shots per minute x10 (divide by 10 for actual)
    },
    
    // === TIMESTAMP ===
    "ts": 1704067200000                // Unix timestamp (ms) when session ended
  }
}
```

### Size Optimization

Keep payload under 1KB:
- Use short keys (`sid` not `sessionId`, `bio` not `biometrics`)
- Limit `splits` array to 20 items (first 10 + last 10 if more)
- Round decimals to 1 place
- Omit null/zero values

### Phone Response

Phone sends ACK after receiving:

```javascript
{
  "type": "ACK",
  "payload": {
    "sessionId": "uuid-string",
    "type": "summary",
    "status": "received"           // "received" | "error"
  }
}
```

**Wait for ACK before sending TIMELINE_CHUNK.**

---

## Phase 2: TIMELINE_CHUNK

### Purpose
- Detailed time-series biometric data for visualization
- Sent in chunks due to size (can be 5-50KB total)
- Phone displays timeline chart with HR, stress, shot markers

### When to Send
- **After** SESSION_SUMMARY ACK is received
- Send chunks sequentially, wait for each chunk ACK

### Message Format

```javascript
{
  "type": "TIMELINE_CHUNK",
  "payload": {
    // === IDENTIFICATION ===
    "sid": "uuid-string",              // Session ID (required)
    "chunk": 0,                        // Current chunk index (0-based)
    "total": 3,                        // Total number of chunks
    
    // === TIMELINE POINTS ===
    // Array of [timestamp_sec, hr, breathRate, stress, eventType]
    // eventType: 0=sample, 1=shot, 2=hit_confirmed
    "pts": [
      [0, 72, 14, 25, 0],              // t=0s, HR=72, breath=14, stress=25, sample
      [3, 74, 14, 28, 0],              // t=3s, sample
      [6, 78, 15, 32, 1],              // t=6s, SHOT fired
      [9, 82, 16, 45, 0],              // t=9s, sample
      [12, 85, 16, 48, 1],             // t=12s, SHOT fired
      // ... more points every 3 seconds
    ],
    
    // === SHOT DETAILS (only in LAST chunk) ===
    "shots": [
      {
        "n": 1,                        // Shot number
        "t": 6,                        // Timestamp (seconds from start)
        "hr": 78,                      // Heart rate at shot
        "br": 15,                      // Breath rate at shot
        "bp": 2,                       // Breath phase: 0=inhale, 1=exhale, 2=pause
        "st": 32,                      // Stress score at shot
        "sd": 75,                      // Steadiness score at shot (0-100)
        "fl": 0                        // Flinch detected: 0=no, 1=yes
      },
      {
        "n": 2,
        "t": 12,
        "hr": 85,
        "br": 16,
        "bp": 1,
        "st": 48,
        "sd": 68,
        "fl": 0
      }
      // ... one entry per shot
    ]
  }
}
```

### Chunking Strategy: SIZE-BASED (Recommended)

**Chunk by BYTE SIZE, not by point count.** This works regardless of how fast you shoot.

#### The Algorithm

```javascript
const MAX_CHUNK_BYTES = 3500;     // Target size (safe margin under 8KB)
const BYTES_PER_POINT = 40;       // Approximate: [ts, hr, br, st, ev]
const BYTES_PER_SHOT = 100;       // Approximate: {n, t, hr, br, bp, st, sd, fl}
const CHUNK_OVERHEAD = 200;       // JSON wrapper, sid, chunk, total

class SizeBasedChunker {
    var _points;
    var _shots;
    var _chunks = [];  // Array of {pointStart, pointEnd, includeShots}
    
    function initialize(points, shots) {
        _points = points;
        _shots = shots;
        _chunks = [];
        
        calculateChunks();
    }
    
    function calculateChunks() {
        var pointIdx = 0;
        var shotsIncluded = false;
        
        while (pointIdx < _points.size() || !shotsIncluded) {
            var chunk = {
                "pointStart" => pointIdx,
                "pointEnd" => pointIdx,
                "includeShots" => false
            };
            
            var currentSize = CHUNK_OVERHEAD;
            
            // Add as many points as fit
            while (pointIdx < _points.size()) {
                var newSize = currentSize + BYTES_PER_POINT;
                if (newSize > MAX_CHUNK_BYTES) {
                    break;  // This point won't fit
                }
                currentSize = newSize;
                pointIdx++;
                chunk["pointEnd"] = pointIdx;
            }
            
            // If this is the last points chunk (or no more points), try to add shots
            var isLastPointsChunk = (pointIdx >= _points.size());
            if (isLastPointsChunk && !shotsIncluded) {
                var shotsSize = _shots.size() * BYTES_PER_SHOT;
                
                if (currentSize + shotsSize <= MAX_CHUNK_BYTES) {
                    // Shots fit in this chunk
                    chunk["includeShots"] = true;
                    shotsIncluded = true;
                } else {
                    // Shots need their own chunk - add this chunk, then add shots chunk
                    _chunks.add(chunk);
                    
                    // Create shots-only chunk
                    chunk = {
                        "pointStart" => pointIdx,
                        "pointEnd" => pointIdx,
                        "includeShots" => true
                    };
                    shotsIncluded = true;
                }
            }
            
            _chunks.add(chunk);
            
            // Safety: if no progress, break
            if (chunk["pointEnd"] == chunk["pointStart"] && !chunk["includeShots"]) {
                System.println("ERROR: Chunk made no progress!");
                break;
            }
        }
        
        System.println("Calculated " + _chunks.size() + " chunks");
        for (var i = 0; i < _chunks.size(); i++) {
            var c = _chunks[i];
            var pts = c["pointEnd"] - c["pointStart"];
            System.println("  Chunk " + i + ": " + pts + " points" + 
                (c["includeShots"] ? " + shots" : ""));
        }
    }
    
    function getChunkCount() {
        return _chunks.size();
    }
    
    function buildChunk(idx) {
        var chunkDef = _chunks[idx];
        var pts = [];
        
        for (var i = chunkDef["pointStart"]; i < chunkDef["pointEnd"]; i++) {
            var p = _points[i];
            pts.add([p.ts, p.hr, p.br, p.st, p.ev]);
        }
        
        var payload = {
            "sid" => _sessionId,
            "chunk" => idx,
            "total" => _chunks.size(),
            "pts" => pts
        };
        
        if (chunkDef["includeShots"]) {
            var shots = [];
            for (var i = 0; i < _shots.size(); i++) {
                var s = _shots[i];
                shots.add({
                    "n" => s.n, "t" => s.t, "hr" => s.hr, "br" => s.br,
                    "bp" => s.bp, "st" => s.st, "sd" => s.sd, "fl" => s.fl
                });
            }
            payload["shots"] = shots;
        }
        
        return {"type" => "TIMELINE_CHUNK", "payload" => payload};
    }
}
```

#### Why This Works

| Scenario | Points | Shots | Result |
|----------|--------|-------|--------|
| 20 shots in 4 sec | 20 | 20 | 1 chunk (~2.8KB) ✅ |
| 50 shots in 10 sec | 50 | 50 | 2 chunks ✅ |
| 100 shots in 30 sec | 100 | 100 | 3 chunks ✅ |
| 5 min slow fire | 100 | 10 | 2 chunks ✅ |

**Time is not a factor.** Chunks are sized to fit, period.

### Timeline Point Format (Compact Array)

Each point is a 5-element array to save space:

```
[timestamp_sec, heartRate, breathRate, stress, eventType]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | timestamp | Number | Seconds from session start |
| 1 | heartRate | Number | BPM (0 if unavailable) |
| 2 | breathRate | Number | Breaths/min (0 if unavailable) |
| 3 | stress | Number | Stress score 0-100 |
| 4 | eventType | Number | 0=sample, 1=shot, 2=hit |

### Shot Detail Fields

| Field | Type | Description |
|-------|------|-------------|
| `n` | Number | Shot number (1-based) |
| `t` | Number | Timestamp in seconds |
| `hr` | Number | Heart rate at moment of shot |
| `br` | Number | Breath rate at shot |
| `bp` | Number | Breath phase: 0=inhale, 1=exhale, 2=pause |
| `st` | Number | Stress score (0-100) |
| `sd` | Number | Steadiness score (0-100) |
| `fl` | Number | Flinch detected: 0=no, 1=yes |

### Phone Response

Phone sends ACK after each chunk:

```javascript
{
  "type": "ACK",
  "payload": {
    "sessionId": "uuid-string",
    "type": "timeline",
    "chunk": 0,                        // Which chunk was received
    "status": "received"               // "received" | "error"
  }
}
```

**Wait for chunk ACK before sending next chunk.**

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SESSION ENDS ON WATCH                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SESSION_SUMMARY                                            │
│                                                                       │
│  Watch ──► Phone: SESSION_SUMMARY (all metadata, ~1KB)               │
│                                                                       │
│  Phone shows toast: "Session Recorded ✓"                             │
│  Phone saves to database immediately                                  │
│                                                                       │
│  Phone ──► Watch: ACK { type: "summary", status: "received" }        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (only after ACK received)
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 2: TIMELINE_CHUNK (repeat for each chunk)                     │
│                                                                       │
│  Watch ──► Phone: TIMELINE_CHUNK { chunk: 0, total: 3 }              │
│  Phone ──► Watch: ACK { type: "timeline", chunk: 0 }                 │
│                                                                       │
│  Watch ──► Phone: TIMELINE_CHUNK { chunk: 1, total: 3 }              │
│  Phone ──► Watch: ACK { type: "timeline", chunk: 1 }                 │
│                                                                       │
│  Watch ──► Phone: TIMELINE_CHUNK { chunk: 2, total: 3, shots: [...] }│
│  Phone ──► Watch: ACK { type: "timeline", chunk: 2 }                 │
│                                                                       │
│  Phone saves timeline to database                                     │
│  Phone updates UI with timeline chart                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SYNC COMPLETE                               │
│                                                                       │
│  Watch can return to idle state                                       │
│  Watch can clear session data from memory                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### ACK Timeout

If no ACK received within **5 seconds**:
1. Retry the message (max 3 attempts)
2. If all retries fail, show error on watch
3. Keep data in memory for manual retry later

### Partial Sync Recovery

If connection drops mid-timeline:
1. Watch remembers which chunks were ACK'd
2. On reconnect, resume from last unACK'd chunk
3. Phone handles duplicate chunks gracefully (idempotent)

### Error ACK

If phone sends error ACK:

```javascript
{
  "type": "ACK",
  "payload": {
    "sessionId": "uuid-string",
    "type": "summary",
    "status": "error",
    "error": "Session not found"
  }
}
```

Watch should:
1. Log the error
2. Keep data for retry
3. Show user notification

---

## Implementation Checklist (Watch App)

### Data Collection During Session

- [ ] Record HR every 3 seconds → store in `timelinePoints` array
- [ ] Record breath rate every 3 seconds
- [ ] Record stress every 3 seconds
- [ ] Mark shot events with `eventType = 1`
- [ ] At each shot, capture detailed biometrics → store in `shotDetails` array
- [ ] Detect flinch (accelerometer spike at trigger)
- [ ] Calculate steadiness (gyro stability)
- [ ] Determine breath phase (rising=inhale, falling=exhale, flat=pause)

### Session End

- [ ] Calculate all summary stats (avg, min, max)
- [ ] Build SESSION_SUMMARY payload
- [ ] Send SESSION_SUMMARY
- [ ] Wait for ACK (5s timeout, 3 retries)
- [ ] On ACK received, proceed to timeline

### Timeline Transmission

- [ ] Calculate number of chunks needed (100 points per chunk)
- [ ] For each chunk:
  - [ ] Build TIMELINE_CHUNK payload
  - [ ] Include `shots` array only in last chunk
  - [ ] Send chunk
  - [ ] Wait for ACK
  - [ ] On ACK, send next chunk
- [ ] After final ACK, clear session data

### State Machine

```
IDLE
  │
  ▼ (session starts)
RECORDING
  │ - Collecting biometrics every 3s
  │ - Recording shots
  │
  ▼ (session ends)
SYNCING_SUMMARY
  │ - Send SESSION_SUMMARY
  │ - Wait for ACK
  │
  ▼ (ACK received)
SYNCING_TIMELINE
  │ - Send chunks one by one
  │ - Wait for each ACK
  │
  ▼ (all chunks ACK'd)
SYNC_COMPLETE
  │
  ▼
IDLE (clear data)
```

---

## Monkey C Code Examples

### Building SESSION_SUMMARY

```javascript
function buildSessionSummary() {
    var summary = {
        "type" => "SESSION_SUMMARY",
        "payload" => {
            "sid" => _sessionId,
            "shots" => _shotsFired,
            "time" => _elapsedTime,
            "dist" => _distance,
            "complete" => _completed,
            "bio" => {
                "hr" => {
                    "avg" => calculateAvg(_hrSamples),
                    "max" => findMax(_hrSamples),
                    "min" => findMin(_hrSamples),
                    "start" => _hrSamples[0],
                    "end" => _hrSamples[_hrSamples.size() - 1]
                },
                "stress" => {
                    "avg" => calculateAvg(_stressSamples),
                    "max" => findMax(_stressSamples),
                    "min" => findMin(_stressSamples)
                },
                "breath" => {
                    "avg" => calculateAvg(_breathSamples)
                }
            },
            "detection" => {
                "auto" => _autoDetectionEnabled,
                "sens" => _detectionSensitivity,
                "overrides" => _manualOverrides
            },
            "steady" => {
                "avg" => calculateAvg(_steadinessSamples),
                "shots" => calculateAvg(_shotSteadiness)
            },
            "perf" => {
                "first" => _firstShotTime,
                "splits" => trimSplits(_splitTimes, 20),
                "avgSplit" => calculateAvg(_splitTimes),
                "spm" => calculateSPM()
            },
            "ts" => System.getTimer()
        }
    };
    
    return summary;
}
```

### Building TIMELINE_CHUNK (Safe Implementation)

```javascript
// CONSTANTS - NEVER EXCEED
const MAX_POINTS_PER_CHUNK = 50;
const MAX_SHOTS_PER_CHUNK = 20;
const MAX_CHUNK_BYTES = 4000;

function buildTimelineChunk(chunkIndex, totalChunks) {
    var startIdx = chunkIndex * MAX_POINTS_PER_CHUNK;
    var endIdx = Math.min(startIdx + MAX_POINTS_PER_CHUNK, _timelinePoints.size());
    
    var points = [];
    for (var i = startIdx; i < endIdx; i++) {
        var p = _timelinePoints[i];
        // Compact array format: [timestamp, hr, breath, stress, eventType]
        points.add([p.timestamp, p.hr, p.breath, p.stress, p.eventType]);
    }
    
    var chunk = {
        "type" => "TIMELINE_CHUNK",
        "payload" => {
            "sid" => _sessionId,
            "chunk" => chunkIndex,
            "total" => totalChunks,
            "pts" => points
        }
    };
    
    // Only add shots to LAST chunk, and limit to MAX_SHOTS_PER_CHUNK
    var isLastChunk = (chunkIndex == totalChunks - 1);
    if (isLastChunk && _shotDetails.size() > 0) {
        var shots = [];
        var shotLimit = Math.min(_shotDetails.size(), MAX_SHOTS_PER_CHUNK);
        
        for (var i = 0; i < shotLimit; i++) {
            var s = _shotDetails[i];
            shots.add({
                "n" => s.number,
                "t" => s.timestamp,
                "hr" => s.heartRate,
                "br" => s.breathRate,
                "bp" => s.breathPhase,
                "st" => s.stress,
                "sd" => s.steadiness,
                "fl" => s.flinch ? 1 : 0
            });
        }
        chunk["payload"]["shots"] = shots;
        
        // If we had to truncate shots, log warning
        if (_shotDetails.size() > MAX_SHOTS_PER_CHUNK) {
            System.println("WARNING: Truncated shots from " + 
                _shotDetails.size() + " to " + MAX_SHOTS_PER_CHUNK);
        }
    }
    
    // VALIDATE SIZE BEFORE RETURNING
    var size = chunk.toString().length();
    System.println("Chunk " + chunkIndex + "/" + totalChunks + 
        " pts=" + points.size() + " size=" + size + "B");
    
    if (size > MAX_CHUNK_BYTES) {
        System.println("ERROR: Chunk " + chunkIndex + " exceeds limit!");
        // Reduce points and retry
        return null;  // Signal error
    }
    
    return chunk;
}
```

### Sync State Machine

```javascript
class SyncManager {
    enum State { IDLE, SYNCING_SUMMARY, SYNCING_TIMELINE, COMPLETE, ERROR }
    
    var _state = State.IDLE;
    var _currentChunk = 0;
    var _totalChunks = 0;
    var _retryCount = 0;
    
    function startSync() {
        _state = State.SYNCING_SUMMARY;
        _retryCount = 0;
        sendSummary();
    }
    
    function sendSummary() {
        var summary = buildSessionSummary();
        Comm.transmit(summary, null, new SyncCommListener(self));
        startAckTimer(5000);  // 5 second timeout
    }
    
    function onAckReceived(ack) {
        cancelAckTimer();
        
        if (ack.get("status").equals("error")) {
            handleError(ack.get("error"));
            return;
        }
        
        if (_state == State.SYNCING_SUMMARY) {
            // Summary ACK received, start timeline
            _state = State.SYNCING_TIMELINE;
            _currentChunk = 0;
            _totalChunks = Math.ceil(_timelinePoints.size() / 100.0);
            sendNextChunk();
        } else if (_state == State.SYNCING_TIMELINE) {
            // Chunk ACK received
            _currentChunk++;
            if (_currentChunk >= _totalChunks) {
                // All chunks sent
                _state = State.COMPLETE;
                onSyncComplete();
            } else {
                sendNextChunk();
            }
        }
    }
    
    function sendNextChunk() {
        var chunk = buildTimelineChunk(_currentChunk, _totalChunks);
        Comm.transmit(chunk, null, new SyncCommListener(self));
        startAckTimer(5000);
    }
    
    function onAckTimeout() {
        _retryCount++;
        if (_retryCount >= 3) {
            _state = State.ERROR;
            showSyncError();
            return;
        }
        
        // Retry
        if (_state == State.SYNCING_SUMMARY) {
            sendSummary();
        } else {
            sendNextChunk();
        }
    }
    
    function onSyncComplete() {
        clearSessionData();
        WatchUi.switchToView(new IdleView(), new IdleDelegate(), WatchUi.SLIDE_LEFT);
    }
}
```

---

## Troubleshooting: "Sent Failed" Errors

### Error: Chunk too large

**Symptom:** `Comm.transmit()` fails or returns error

**Cause:** Payload exceeds ~8KB limit

**Solution:**
```javascript
// BEFORE sending, validate size:
var chunk = buildTimelineChunk(idx, total);
var size = chunk.toString().length();

if (size > 4000) {
    System.println("CHUNK TOO LARGE: " + size);
    // REDUCE MAX_POINTS_PER_CHUNK from 50 to 30
    // REDUCE MAX_SHOTS_PER_CHUNK from 20 to 10
}
```

### Error: Empty timeline data

**Symptom:** Summary sends, timeline fails immediately

**Cause:** `_timelinePoints` array is empty

**Solution:**
```javascript
// After session ends, verify data exists:
System.println("Timeline points: " + _timelinePoints.size());
System.println("Shot details: " + _shotDetails.size());

if (_timelinePoints.size() == 0) {
    System.println("No timeline data - skipping Phase 2");
    // Just end sync after summary ACK
    return;
}
```

### Error: Memory exhaustion

**Symptom:** Watch crashes or hangs during send

**Cause:** Too much data in memory

**Solution:**
```javascript
// Clear points AFTER sending each chunk (not before):
function onChunkAcked(chunkIndex) {
    // Remove sent points from memory
    var startIdx = chunkIndex * MAX_POINTS_PER_CHUNK;
    var endIdx = Math.min(startIdx + MAX_POINTS_PER_CHUNK, _timelinePoints.size());
    
    // Don't clear - just mark as sent
    _lastSentChunk = chunkIndex;
}
```

### Debugging Template

```javascript
function debugSync() {
    System.println("=== SYNC DEBUG ===");
    System.println("Session ID: " + _sessionId);
    System.println("Timeline points: " + _timelinePoints.size());
    System.println("Shot details: " + _shotDetails.size());
    System.println("Current state: " + _syncState);
    System.println("Current chunk: " + _currentChunk + "/" + _totalChunks);
    System.println("==================");
}

// Call this before transmit:
debugSync();
```

### ⚠️ IMPORTANT: Timeline Point Collection Rules

**Timeline points should be sampled at FIXED intervals (every 3 seconds), NOT per-shot!**

```javascript
// WRONG - Creates too many points for fast shooters:
function onShotDetected() {
    _timelinePoints.add({ts: now, hr: hr, ...});  // BAD!
}

// CORRECT - Sample at fixed interval:
var _lastSampleTime = 0;
const SAMPLE_INTERVAL_MS = 3000;  // Every 3 seconds

function onTimerTick() {
    var now = System.getTimer();
    if (now - _lastSampleTime >= SAMPLE_INTERVAL_MS) {
        _timelinePoints.add({ts: now, hr: hr, ev: 0});  // ev=0 means sample
        _lastSampleTime = now;
    }
}

// Shots go in SEPARATE array, not timeline:
function onShotDetected() {
    _shotDetails.add({n: shotNum, t: now, hr: hr, ...});  // Shots array
}
```

### Maximum Data Limits

| Session Length | Max Timeline Points | Max Shots |
|----------------|---------------------|-----------|
| 30 seconds | 10 | 50 |
| 1 minute | 20 | 50 |
| 5 minutes | 100 | 50 |
| 10 minutes | 200 | 50 |
| 30 minutes | 600 | 50 |

**If you have more points than expected, you're sampling too frequently!**

```javascript
// Safety limit - trim excess points before sync
function trimTimelineData() {
    const MAX_TOTAL_POINTS = 600;  // 30 min max
    const MAX_SHOTS = 50;
    
    if (_timelinePoints.size() > MAX_TOTAL_POINTS) {
        System.println("WARNING: Trimming timeline from " + 
            _timelinePoints.size() + " to " + MAX_TOTAL_POINTS);
        // Keep first and last, sample middle
        _timelinePoints = downsample(_timelinePoints, MAX_TOTAL_POINTS);
    }
    
    if (_shotDetails.size() > MAX_SHOTS) {
        System.println("WARNING: Trimming shots from " + 
            _shotDetails.size() + " to " + MAX_SHOTS);
        _shotDetails = _shotDetails.slice(0, MAX_SHOTS);
    }
}
```

---

## Testing Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| Short session (30s, 5 shots) | 1 chunk, summary + timeline sync < 3s |
| Long session (10min, 50 shots) | ~3 chunks, summary + timeline sync < 10s |
| Connection lost mid-sync | Watch retries, resumes on reconnect |
| Phone rejects summary | Watch shows error, keeps data |
| Very fast splits (100+ shots) | Splits array trimmed to 20 |
| No HR sensor data | HR fields = 0, sync still works |
| Session with no shots | shots=0, empty shotDetails, timeline still sent |
| **Chunk > 4KB** | **ERROR logged, chunk split automatically** |
| **50+ shots** | **Shots truncated to 20 in last chunk** |

---

## Migration Notes

### Removed: SESSION_DETAILS

The following fields have moved:

| Old Location (SESSION_DETAILS) | New Location |
|-------------------------------|--------------|
| `autoDetected` | SESSION_SUMMARY → `detection.auto` |
| `detectionSensitivity` | SESSION_SUMMARY → `detection.sens` |
| `manualOverrides` | SESSION_SUMMARY → `detection.overrides` |
| `steadiness` | SESSION_SUMMARY → `steady` |
| `biometrics` (detailed) | SESSION_SUMMARY → `bio` |
| `shotData` (per-shot) | TIMELINE_CHUNK → `shots` array |

### Phone Compatibility

The phone app still accepts `SESSION_DETAILS` for backward compatibility but ignores it. Remove from watch when ready.

---

## Questions?

Contact the mobile app engineer for clarification on:
- Payload format questions
- ACK format/timing
- Error handling edge cases
- Testing coordination

---

## Complete Safe Timeline Sync (Copy-Paste Ready)

```javascript
// TimelineSyncer.mc - Drop-in implementation

class TimelineSyncer {
    // === HARD LIMITS - NEVER CHANGE ===
    const MAX_POINTS_PER_CHUNK = 50;   // ~2KB of points
    const MAX_SHOTS_PER_CHUNK = 20;    // ~2KB of shots  
    const MAX_CHUNK_BYTES = 4000;      // Stay under 8KB limit
    const ACK_TIMEOUT_MS = 5000;
    const MAX_RETRIES = 3;
    
    var _sessionId;
    var _timelinePoints;  // Array of {ts, hr, br, st, ev}
    var _shotDetails;     // Array of {n, t, hr, br, bp, st, sd, fl}
    var _currentChunk = 0;
    var _totalChunks = 0;
    var _retryCount = 0;
    var _timer;
    
    function initialize(sessionId, points, shots) {
        _sessionId = sessionId;
        _timelinePoints = points;
        _shotDetails = shots;
        _currentChunk = 0;
        _retryCount = 0;
        
        // Calculate chunks needed
        if (_timelinePoints.size() == 0) {
            _totalChunks = 0;
            System.println("[Sync] No timeline data to send");
            return;
        }
        
        _totalChunks = Math.ceil(_timelinePoints.size() / MAX_POINTS_PER_CHUNK);
        System.println("[Sync] Will send " + _totalChunks + " chunks");
        System.println("[Sync] Points: " + _timelinePoints.size());
        System.println("[Sync] Shots: " + _shotDetails.size());
    }
    
    function start() {
        if (_totalChunks == 0) {
            onComplete();
            return;
        }
        sendCurrentChunk();
    }
    
    function sendCurrentChunk() {
        var chunk = buildChunk(_currentChunk);
        
        if (chunk == null) {
            System.println("[Sync] ERROR: Failed to build chunk");
            onError("Chunk build failed");
            return;
        }
        
        // Validate size
        var size = chunk.toString().length();
        System.println("[Sync] Chunk " + _currentChunk + "/" + _totalChunks + 
            " size=" + size + "B");
        
        if (size > MAX_CHUNK_BYTES) {
            System.println("[Sync] ERROR: Chunk too large!");
            onError("Chunk exceeds size limit: " + size);
            return;
        }
        
        // Start timeout timer
        _timer = new Timer.Timer();
        _timer.start(method(:onTimeout), ACK_TIMEOUT_MS, false);
        
        // Send
        var result = Comm.transmit(chunk, null, new Method(self, :onTransmitComplete));
        if (!result) {
            System.println("[Sync] Transmit returned false");
            _timer.stop();
            handleRetry();
        }
    }
    
    function buildChunk(idx) {
        var startIdx = idx * MAX_POINTS_PER_CHUNK;
        var endIdx = Math.min(startIdx + MAX_POINTS_PER_CHUNK, _timelinePoints.size());
        
        // Build points array (compact format)
        var pts = [];
        for (var i = startIdx; i < endIdx; i++) {
            var p = _timelinePoints[i];
            pts.add([p.ts, p.hr, p.br, p.st, p.ev]);
        }
        
        var payload = {
            "sid" => _sessionId,
            "chunk" => idx,
            "total" => _totalChunks,
            "pts" => pts
        };
        
        // Add shots only to LAST chunk
        if (idx == _totalChunks - 1 && _shotDetails.size() > 0) {
            var shots = [];
            var limit = Math.min(_shotDetails.size(), MAX_SHOTS_PER_CHUNK);
            
            for (var i = 0; i < limit; i++) {
                var s = _shotDetails[i];
                shots.add({
                    "n" => s.n,
                    "t" => s.t,
                    "hr" => s.hr,
                    "br" => s.br,
                    "bp" => s.bp,
                    "st" => s.st,
                    "sd" => s.sd,
                    "fl" => s.fl
                });
            }
            payload["shots"] = shots;
        }
        
        return {
            "type" => "TIMELINE_CHUNK",
            "payload" => payload
        };
    }
    
    function onAck(ack) {
        _timer.stop();
        _retryCount = 0;
        
        var ackChunk = ack.get("chunk");
        var status = ack.get("status");
        
        if (!status.equals("received")) {
            System.println("[Sync] ACK error: " + ack.get("error"));
            onError("Phone rejected chunk");
            return;
        }
        
        System.println("[Sync] Chunk " + ackChunk + " ACK received");
        
        _currentChunk++;
        if (_currentChunk >= _totalChunks) {
            onComplete();
        } else {
            sendCurrentChunk();
        }
    }
    
    function onTimeout() {
        System.println("[Sync] Timeout waiting for ACK");
        handleRetry();
    }
    
    function handleRetry() {
        _retryCount++;
        if (_retryCount >= MAX_RETRIES) {
            onError("Max retries exceeded");
            return;
        }
        System.println("[Sync] Retry " + _retryCount + "/" + MAX_RETRIES);
        sendCurrentChunk();
    }
    
    function onTransmitComplete(status) {
        if (status != Comm.SUCCESS) {
            System.println("[Sync] Transmit failed: " + status);
            _timer.stop();
            handleRetry();
        }
    }
    
    function onComplete() {
        System.println("[Sync] ✅ Timeline sync complete!");
        // Clear data, return to idle
    }
    
    function onError(msg) {
        System.println("[Sync] ❌ Error: " + msg);
        // Show error on watch, keep data for retry
    }
}
```

### Usage

```javascript
// In SyncManager, after summary ACK:
function onSummaryAckReceived() {
    var syncer = new TimelineSyncer();
    syncer.initialize(_sessionId, _timelinePoints, _shotDetails);
    syncer.start();
}
```

---

*Protocol Version: 2.0*  
*Last Updated: January 2025*

