# Session Creation Step Flow

A user-friendly multi-step wizard for creating new shooting sessions.

## 📁 Structure

```
components/session/create/
├── CreateSessionStepFlow.tsx       # Main orchestrator
├── types.ts                         # Shared TypeScript types
├── index.ts                         # Public exports
└── steps/
    ├── SessionNameStep.tsx          # Step 1: Type & name
    ├── SessionTimeLocationStep.tsx  # Step 2: Time & location
    └── SessionNotesStep.tsx         # Step 3: Notes & review
```

## 🎯 Flow Overview

### Step 1: Name Your Session
- **Session Type**: Individual or Squad Training (visual toggle cards)
- **Session Name** (optional): Custom name like "Morning Practice"
- Single "Continue" button
- Icon: Create/pen

### Step 2: Time & Location
- **Time of Day**: Morning, Afternoon, Evening, or Night (visual selector with weather icons)
- **Range Location** (optional): e.g., "Range A"
- Back/Continue navigation
- Icon: Clock

### Step 3: Notes & Review
- **Session Notes** (optional): Freeform text area for additional information
- **Summary Card**: Review all entered details before starting
- Shows type, name, location, and time in a clean card
- Back/Start Session buttons with loading state
- Icon: Checkmark
- **Note**: Organization context is automatically based on your selected org

## 🔧 Usage

```tsx
import { CreateSessionBottomSheet } from "@/components/CreateSessionBottomSheet";

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <CreateSessionBottomSheet
      visible={visible}
      onClose={() => setVisible(false)}
    />
  );
}
```

## 📝 Form Data Structure

```typescript
interface SessionFormData {
  name: string;                    // Optional session name
  rangeLocation: string;           // Optional range location
  dayPeriod: DayPeriod;           // "morning" | "afternoon" | "evening" | "night"
  isSquad: boolean;               // Individual vs squad
  comments: string;               // Optional notes
  organizationId: string | null;  // Org context (auto-populated)
}
```

## 🎨 Design Features

- **Progress Indicator**: Shows current step (1 of 3, 2 of 3, 3 of 3)
- **Visual Progress Bar**: Numbered steps with checkmarks for completed
- **Step Headers**: Large icon (72px), title, and description for each step
- **Smart Navigation**: 
  - Step 1 (Name): Only "Continue" button
  - Step 2 (Time & Location): "Back" + "Continue" buttons
  - Step 3 (Notes): "Back" + "Start Session" button
- **Auto Context**: Organization context automatically set from selected org
- **Validation**: Form submits only on final step
- **Loading States**: Disabled buttons and spinner during submission
- **Error Handling**: User-friendly alerts for authentication or network errors
- **Icon Circles**: All buttons have icons in colored circles for visual interest

## 🔄 State Management

- Local state for step navigation
- Form data stored in single object
- Partial updates via `updateFormData()`
- Reset on close or successful submission
- Prevents close during submission

## 🚀 Adding New Steps

1. Create step component in `steps/` folder:
```tsx
import { StepProps } from "../types";

export function MyNewStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  return (
    <View>
      {/* Your step UI */}
      <TouchableOpacity onPress={onNext}>Continue</TouchableOpacity>
    </View>
  );
}
```

2. Add to `STEPS` array in `CreateSessionStepFlow.tsx`:
```tsx
const STEPS = [
  { id: 1, title: "Name", component: SessionNameStep },
  { id: 2, title: "Time & Location", component: SessionTimeLocationStep },
  { id: 3, title: "My New Step", component: MyNewStep },
  { id: 4, title: "Notes", component: SessionNotesStep },
];
```

3. Update step rendering in `CreateSessionStepFlow.tsx`:
```tsx
{currentStep === 2 && (
  <MyNewStep
    formData={formData}
    updateFormData={updateFormData}
    onNext={handleNext}
    onBack={handleBack}
    isFirstStep={false}
    isLastStep={false}
  />
)}
```

3. Update `SessionFormData` in `types.ts` if needed:
```tsx
export interface SessionFormData {
  // ... existing fields
  myNewField: string;
}
```

## 📦 Dependencies

- `BaseBottomSheet` - Bottom sheet container
- `useAuth` - User authentication
- `useOrganizationsStore` - Org context
- `sessionStatsStore` - Session creation logic
- `@expo/vector-icons` - Icons
- `react-native` - Core components

## 🎯 Key Benefits

✅ **Progressive Disclosure**: Only show relevant fields at each step
✅ **Better UX**: Less overwhelming than single long form
✅ **Clear Progress**: Users know where they are in the flow
✅ **Flexible**: Easy to add/remove/reorder steps
✅ **Type-Safe**: Full TypeScript support
✅ **Maintainable**: Isolated step components

## 🐛 Debugging

- Check console for `createSession` errors
- Verify `user.id` exists before submission
- Ensure `selectedOrgId` is populated correctly
- Test both personal and org contexts
- Check RLS policies if sessions don't appear

## 📱 Platform Support

- ✅ iOS
- ✅ Android
- ✅ Web (Expo)

---

**Last Updated**: November 2024

