# 📅 Professional Calendar - Setup Complete!

## ✅ What Was Installed

1. **Library**: `react-native-calendars` - Professional, battle-tested calendar component
2. **Custom Components**: Beautiful themed calendar components matching your app design
3. **Hooks**: Smart state management for calendar data
4. **Demo Screen**: Live example with sample events

---

## 🎨 Components Created

### 1. **WeekCalendar** (`components/ui/WeekCalendar.tsx`) ⭐ NEW
Beautiful 7-day week view with:
- 📅 Horizontal scrollable week view (Monday-Sunday)
- ✨ Smooth animations (React Native Reanimated)
- 🌓 Automatic dark/light mode
- 🎯 Today indicator with accent border
- 📍 Multi-dot event markers
- 🎨 Large touch-optimized day cards
- 🎨 Themed with your brand colors (Orange #E76925 accent)

### 2. **Calendar** (`components/ui/Calendar.tsx`)
Main monthly calendar component with:
- ✨ Smooth animations (React Native Reanimated)
- 🌓 Automatic dark/light mode
- 🎯 Custom day rendering
- 📍 Multi-dot event markers
- 🎨 Themed with your brand colors (Orange #E76925 accent)

### 3. **TrainingCalendar** (`components/ui/TrainingCalendar.tsx`)
Complete training calendar solution with:
- 📋 Event list for selected date
- ➕ Create button for new trainings
- 🎯 Event type colors (Training, Session, Assessment, etc.)
- 📱 Touch-optimized event cards

### 4. **CompactCalendar**
Smaller monthly version for dashboard widgets

### 5. **useCalendar Hook** (`hooks/ui/useCalendar.ts`)
State management and utilities:
- Event filtering by date
- Automatic marked dates generation
- Date formatting helpers
- Event type colors

---

## 🚀 Quick Start

### View the Demo

**Option 1**: Open your app and tap the **"📅 View Training Calendar"** button on the dashboard

**Option 2**: Navigate directly:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/(protected)/calendar-demo');
```

### Use in Your Own Screen

```typescript
import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';

function MyScreen() {
  const events: CalendarEvent[] = [
    {
      id: '1',
      date: '2024-11-15',
      title: 'Sniper Training',
      type: 'training', // training, session, assessment, briefing, qualification
    },
  ];

  return (
    <TrainingCalendar
      events={events}
      onEventPress={(event) => console.log('Selected:', event)}
      onCreateTraining={(date) => console.log('Create on:', date)}
    />
  );
}
```

---

## 🎨 Design Features

### Colors (Auto-themed)

**Light Mode:**
- Primary: Dark Gray (#4A4A4A)
- Accent: Orange (#E76925)
- Background: White (#FFFFFF)
- Text: Dark (#2A2A2A)

**Dark Mode:**
- Primary: Light Gray (#8A8A8A)
- Accent: Light Orange (#FF7A3D)
- Background: Dark (#1A1A1A)
- Text: Light (#E8E8E8)

### Event Type Colors
- 🟢 **Training**: Tactical Green (#5A8473)
- 🔵 **Session**: Steel Blue (#5A7A8C)
- 🟠 **Assessment**: Brand Orange (#E76925)
- 🟣 **Briefing**: Soft Purple (#8B7FA1)
- 🔴 **Qualification**: Alert Red (#DC3545)

---

## 📖 Integration with Backend

```typescript
// Example: Fetch trainings from Supabase
import { AuthenticatedClient } from '@/services/authenticatedClient';
import { CalendarEvent } from '@/hooks/ui/useCalendar';

async function getTrainingEvents(userId: string, orgId?: string) {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('trainings')
    .select('*')
    .eq(orgId ? 'org_id' : 'created_by', orgId || userId);

  if (error) throw error;

  // Transform to CalendarEvent format
  return data.map(training => ({
    id: training.id,
    date: training.scheduled_date.split('T')[0], // YYYY-MM-DD
    title: training.name,
    type: 'training' as const,
  }));
}

// Use in component
function TrainingScreen() {
  const { userId, orgId } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    getTrainingEvents(userId, orgId).then(setEvents);
  }, [userId, orgId]);

  return <TrainingCalendar events={events} />;
}
```

---

## 📱 Usage Examples

### 1. Week View (Current Dashboard)
```typescript
import { WeekCalendar } from '@/components/ui/WeekCalendar';

<WeekCalendar
  selectedDate={selectedDate}
  onDayPress={setSelectedDate}
  markedDates={markedDates}
/>
```

### 2. Monthly Compact Widget
```typescript
import { CompactCalendar } from '@/components/ui/Calendar';

<CompactCalendar
  markedDates={upcomingTrainings}
  onDayPress={(day) => navigateToDay(day)}
/>
```

### 3. Full Calendar Page
```typescript
import { Calendar } from '@/components/ui/Calendar';

<Calendar
  title="My Training Schedule"
  onDayPress={(day) => setSelectedDate(day.dateString)}
  selectedDate={selectedDate}
  markedDates={trainingDates}
/>
```

### 4. With Smart Hook
```typescript
import { useCalendar } from '@/hooks/ui/useCalendar';

const {
  selectedDate,
  markedDates,
  handleDayPress,
  selectedDateEvents,
} = useCalendar(myEvents);

<Calendar
  onDayPress={handleDayPress}
  selectedDate={selectedDate}
  markedDates={markedDates}
/>
```

---

## 📚 Documentation

Full documentation available at:
`components/ui/calendar/README.md`

Includes:
- Complete API reference
- All component props
- Hook documentation
- Styling guide
- Integration examples
- Troubleshooting

---

## 🎯 Next Steps

1. **Test the Demo**: Tap the calendar button on your dashboard
2. **Customize**: Modify colors, event types, or styling as needed
3. **Integrate**: Connect to your training data from Supabase
4. **Extend**: Add features like:
   - Week view
   - Multi-day events
   - Event filtering
   - Export to calendar apps

---

## 🔧 Files Created

```
components/ui/
  ├── WeekCalendar.tsx          # ⭐ NEW: 7-day week view
  ├── Calendar.tsx              # Main monthly calendar component
  ├── TrainingCalendar.tsx      # Training-specific calendar
  ├── CalendarExamples.tsx      # Usage examples
  └── calendar/
      ├── index.ts              # Exports
      └── README.md             # Full documentation

hooks/ui/
  └── useCalendar.ts            # Calendar state hook

app/(protected)/
  └── calendar-demo.tsx         # Live demo screen (both views)
```

---

## 💡 Tips

- Calendar automatically uses your theme colors
- Supports offline mode (cached events)
- Touch targets optimized for mobile (36px min)
- Animations are smooth and performant
- All dates use ISO format (YYYY-MM-DD)

---

## 🐛 Troubleshooting

**Calendar not showing?**
- Restart Metro: `npm start -- --reset-cache`
- Check imports are correct

**Theme not working?**
- Verify `useColors` hook is working
- Check ThemeProvider wraps your app

**Animations stuttering?**
- Enable Reanimated's Hermes engine
- Check for console errors

---

## 🎉 You're All Set!

Your calendar is ready to use! Tap the **"📅 View Training Calendar"** button on your dashboard to see it in action.

For questions or customization help, check the full README at:
`components/ui/calendar/README.md`

