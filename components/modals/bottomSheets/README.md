# Bottom Sheets

Reusable bottom sheet components built on `@gorhom/bottom-sheet`.

## Quick Start

```tsx
import { useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ExampleBottomSheet, ConfirmBottomSheet, FormBottomSheet } from '@/components/modals/bottomSheets';

function MyComponent() {
  const sheetRef = useRef<BottomSheetModal>(null);

  return (
    <>
      <Button onPress={() => sheetRef.current?.present()}>
        Open Sheet
      </Button>

      <ExampleBottomSheet ref={sheetRef} />
    </>
  );
}
```

## Available Components

### ExampleBottomSheet
Basic example showing how to create custom bottom sheets.

```tsx
const ref = useRef<BottomSheetModal>(null);

<ExampleBottomSheet ref={ref} />

ref.current?.present(); // Open
ref.current?.dismiss(); // Close
```

### ConfirmBottomSheet
Confirmation dialog for destructive or important actions.

```tsx
<ConfirmBottomSheet
  ref={ref}
  title="Delete Item?"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  destructive={true}
  onConfirm={() => console.log('Confirmed')}
  onCancel={() => console.log('Cancelled')}
/>
```

**Props:**
- `title` - Dialog title (default: "Confirm Action")
- `message` - Description text (default: "Are you sure you want to proceed?")
- `confirmText` - Confirm button text (default: "Confirm")
- `cancelText` - Cancel button text (default: "Cancel")
- `destructive` - Red destructive styling (default: false)
- `confirmColor` - Custom confirm button color
- `onConfirm` - Callback when confirmed
- `onCancel` - Callback when cancelled

### FormBottomSheet
Single text input form for quick data entry.

```tsx
<FormBottomSheet
  ref={ref}
  title="Add Note"
  placeholder="Enter your note..."
  submitText="Save"
  onSubmit={(value) => console.log('Submitted:', value)}
  onCancel={() => console.log('Cancelled')}
/>
```

**Props:**
- `title` - Form title (default: "Enter Information")
- `placeholder` - Input placeholder (default: "Type here...")
- `submitText` - Submit button text (default: "Submit")
- `cancelText` - Cancel button text (default: "Cancel")
- `onSubmit` - Callback with input value
- `onCancel` - Callback when cancelled

## Creating Custom Bottom Sheets

Use `BaseBottomSheet` to create your own:

```tsx
import { forwardRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BaseBottomSheet } from '../BaseBottomSheet';

export const MyCustomSheet = forwardRef<BottomSheetModal>((props, ref) => {
  return (
    <BaseBottomSheet ref={ref} snapPoints={["60%"]}>
      {/* Your custom content */}
    </BaseBottomSheet>
  );
});
```

**BaseBottomSheet Props:**
- `snapPoints` - Height snap points (default: ["50%"])
- `enableDynamicSizing` - Auto-size to content (default: false)
- `enablePanDownToClose` - Swipe down to dismiss (default: true)
- `backgroundStyle` - Custom background styles
- `handleStyle` - Custom handle styles
- `onDismiss` - Callback when dismissed

## Control Methods

```tsx
const ref = useRef<BottomSheetModal>(null);

ref.current?.present();           // Open
ref.current?.dismiss();            // Close
ref.current?.snapToIndex(0);      // Snap to specific index
ref.current?.snapToPosition("80%"); // Snap to position
```

