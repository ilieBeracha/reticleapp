# Insights Screen Integration Plan

## 📋 Overview
Transform the Insights screen into a rich analytics dashboard using native iOS features including:
- **expo-glass-effect**: iOS 18+ glass morphism UI
- **expo-sensors**: Motion and device sensor data
- **expo-local-authentication**: Biometric security for sensitive data

---

## 🎯 Current State

### Files:
- `app/(protected)/workspace/insights.tsx` - Basic screen with GlassViewScreen wrapper
- `components/GlassViewScreen.ios.tsx` - Demo component showing glass effect capabilities
- `app.json` - Already has plugins configured:
  - ✅ expo-local-authentication
  - ✅ expo-sensors
  - ✅ expo-glass-effect (via GlassViewScreen component)

### Tab Visibility:
- Only shows in **Personal Mode** (when no workspace is selected)
- Hidden when organization/workspace is active

---

## 🏗️ Integration Architecture

### Phase 1: Core Dashboard Setup
**Goal**: Replace demo with functional analytics dashboard

#### Components to Create:
1. **`InsightsScreen.tsx`** - Main analytics screen
2. **`components/insights/StatCard.tsx`** - Glass-effect stat cards
3. **`components/insights/MotionTracker.tsx`** - Sensor-based activity tracking
4. **`components/insights/BiometricLock.tsx`** - Secure data access
5. **`components/insights/TrendChart.tsx`** - Activity trends visualization

---

## 🎨 Design System

### Glass Effect Integration

#### Use Cases:
1. **Stat Cards** - Floating glass cards with blur effect
   - Training sessions count
   - Accuracy metrics
   - Time spent training
   - Personal bests

2. **Charts Background** - Glass container for charts
   - Weekly activity graph
   - Accuracy trends
   - Performance metrics

3. **Quick Actions** - Interactive glass buttons
   - Start session
   - View history
   - Settings

#### Glass Styles to Use:
```typescript
// Light mode: 'regular' - subtle blur
// Dark mode: 'clear' - stronger blur
// Tint colors: Match app theme (primary, green for positive metrics)
```

---

## 📊 Features to Implement

### 1. **Motion-Based Activity Tracking** (expo-sensors)

**Sensors to Use:**
- `Accelerometer` - Detect movement patterns
- `Gyroscope` - Track orientation changes
- `Magnetometer` - Compass heading

**Implementation:**
```typescript
import { Accelerometer, Gyroscope } from 'expo-sensors';

// Track user movement during training
// Detect device shaking for quick actions
// Monitor stability during aim training
```

**Features:**
- Real-time motion visualization
- Movement pattern analysis
- Stability scoring
- Shake to refresh data

---

### 2. **Biometric Security** (expo-local-authentication)

**Use Cases:**
- Protect sensitive performance data
- Secure personal records
- Lock insights when app is backgrounded

**Implementation:**
```typescript
import * as LocalAuthentication;

// Check if biometrics available
// Authenticate before showing sensitive data
// Re-authenticate after timeout
```

**Features:**
- Face ID / Touch ID unlock
- Blur screen when backgrounded
- Auto-lock after inactivity
- Secure data toggle in settings

---

### 3. **Analytics Dashboard Layout**

#### Header Section (Glass Effect):
```
┌─────────────────────────────────────┐
│  Insights                    🔒     │ 
│  Personal Performance Analytics     │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐    │
│  │  42   │ │  89%  │ │ 12.5h │    │ (Glass Cards)
│  │Sessions│ │Accuracy│ │ Time  │    │
│  └───────┘ └───────┘ └───────┘    │
└─────────────────────────────────────┘
```

#### Stats Cards (With Motion):
- Tilt device to see depth effect
- Parallax scrolling with glass panels
- Interactive cards that respond to touch

#### Charts Section:
```
┌─────────────────────────────────────┐
│  Weekly Activity        [Filter ▼]  │
│  ┌───────────────────────────────┐  │
│  │   ┌──┐                        │  │ (Glass Container)
│  │   │  │  ┌──┐                  │  │
│  │ ┌─┤  ├──┤  │  ┌──┐           │  │
│  │ │ └──┘  └──┘  │  │           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### Motion Tracker:
```
┌─────────────────────────────────────┐
│  Stability Analysis    [Live 🔴]    │
│  ┌───────────────────────────────┐  │
│  │    📱                          │  │ (Real-time)
│  │   /│\  Stability: 92%         │  │
│  │  / | \                        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🛠️ Implementation Steps

### Step 1: Setup Basic Structure
```bash
# No new packages needed - already installed!
# Just import and use
```

### Step 2: Create Component Structure
```
components/insights/
├── InsightsDashboard.tsx       # Main dashboard
├── StatCard.tsx                # Glass stat card
├── TrendChart.tsx              # Performance chart
├── MotionVisualizer.tsx        # Live motion tracking
├── BiometricGuard.tsx          # Security wrapper
├── QuickActions.tsx            # Action buttons
└── ActivityTimeline.tsx        # Recent activity list
```

### Step 3: Implement Core Features

#### A. Glass Effect Stats Cards
```typescript
import { GlassView } from 'expo-glass-effect';

<GlassView
  style={styles.statCard}
  glassEffectStyle="regular"
  tintColor={colors.primary + '40'}
>
  <Ionicons name="target" size={24} />
  <Text style={styles.statValue}>42</Text>
  <Text style={styles.statLabel}>Sessions</Text>
</GlassView>
```

#### B. Motion Tracking
```typescript
import { Accelerometer } from 'expo-sensors';

const [motion, setMotion] = useState({ x: 0, y: 0, z: 0 });

useEffect(() => {
  Accelerometer.addListener(accelerometerData => {
    setMotion(accelerometerData);
  });
  Accelerometer.setUpdateInterval(100);
  
  return () => Accelerometer.removeAllListeners();
}, []);

// Calculate stability score from motion data
const stability = calculateStability(motion);
```

#### C. Biometric Lock
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const unlockInsights = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (hasHardware && enrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your insights',
      fallbackLabel: 'Use passcode',
    });
    
    if (result.success) {
      setIsUnlocked(true);
    }
  }
};
```

---

## 📱 Screen States

### 1. Locked State
- Blurred content
- Face ID / Touch ID prompt
- "Tap to unlock" message

### 2. Loading State
- Animated glass skeleton cards
- Loading indicators

### 3. Active State
- Live motion tracking
- Interactive glass cards
- Real-time updates

### 4. Empty State
- No data available message
- Call-to-action to start training
- Glass effect on empty state card

---

## 🎯 Key Features by Priority

### Priority 1 (MVP):
- [x] Glass effect stat cards
- [x] Basic stats (sessions, accuracy, time)
- [x] Biometric lock toggle
- [ ] Simple trend chart

### Priority 2:
- [ ] Motion-based parallax effects
- [ ] Real-time stability tracking
- [ ] Weekly activity timeline
- [ ] Shake to refresh

### Priority 3:
- [ ] Advanced motion patterns
- [ ] Predictive analytics
- [ ] Goal tracking
- [ ] Achievements system

---

## 🎨 Visual Style Guide

### Glass Effect Settings:
```typescript
const glassConfig = {
  // Light theme
  light: {
    style: 'regular',
    tintColor: theme.colors.primary + '30', // 30% opacity
    borderRadius: 16,
  },
  // Dark theme
  dark: {
    style: 'clear',
    tintColor: theme.colors.primary + '20', // 20% opacity
    borderRadius: 16,
  },
};
```

### Card Layouts:
- Padding: 16px
- Border Radius: 16px
- Gap between cards: 12px
- Shadow: Subtle, iOS native feel

### Motion Effects:
- Parallax intensity: 20-30px max
- Update frequency: 60fps (16ms)
- Smooth animations: spring physics

---

## 🔒 Security Considerations

### Biometric Authentication:
1. **Initial Setup**:
   - Prompt user to enable on first launch
   - Store preference in secure storage
   - Respect user choice

2. **Session Management**:
   - Auto-lock after 5 minutes
   - Re-authenticate on app resume
   - Clear sensitive data on lock

3. **Fallback**:
   - Passcode option if biometrics fail
   - Clear error messages
   - Retry mechanism

---

## 📊 Data Structure

### Analytics Data Model:
```typescript
interface InsightsData {
  stats: {
    totalSessions: number;
    avgAccuracy: number;
    totalTime: number; // milliseconds
    streak: number; // days
  };
  trends: {
    weekly: ChartDataPoint[];
    monthly: ChartDataPoint[];
  };
  motion: {
    stability: number; // 0-100
    patterns: MotionPattern[];
  };
  lastUpdated: Date;
}
```

---

## 🚀 Next Steps

1. **Create base InsightsScreen component**
2. **Implement glass effect stat cards**
3. **Add biometric lock functionality**
4. **Integrate motion tracking**
5. **Build trend visualization**
6. **Polish animations and interactions**
7. **Test on physical device (iOS 18+)**

---

## ⚠️ Important Notes

### iOS Version Requirements:
- Glass Effect: **iOS 18+** (check with `isLiquidGlassAvailable()`)
- Provide fallback UI for older versions
- Test graceful degradation

### Performance:
- Limit sensor update frequency (100ms intervals)
- Debounce motion calculations
- Use `React.memo` for glass components
- Implement virtualization for lists

### Testing:
- **MUST test on physical device** (simulator limitations)
- Face ID only works on real devices
- Motion sensors need physical device
- Glass effect requires iOS 18+

---

## 🎯 Success Metrics

- Fast load time (<1s)
- Smooth animations (60fps)
- Biometric auth success rate >95%
- User engagement (time on insights screen)
- Feature adoption rate

---

## 📝 Documentation Needs

1. User guide for insights features
2. Privacy policy for motion data
3. Biometric setup instructions
4. Troubleshooting guide
5. API documentation for analytics

---

**Status**: Ready to implement
**Estimated Time**: 2-3 days for MVP
**Dependencies**: All packages already installed ✅

