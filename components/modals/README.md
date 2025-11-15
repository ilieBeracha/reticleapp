# Modals

This directory contains modal and bottom sheet components for the application.

## UserMenuBottomSheet

A bottom sheet component that displays user account options including settings, organization switching, and logout.

### Usage

```tsx
import { BottomSheet, BottomSheetPortal, BottomSheetTrigger } from '@/components/ui/bottomsheet';
import { UserMenuBottomSheetContent } from '@/components/modals';

function MyComponent() {
  return (
    <BottomSheet snapToIndex={0}>
      {/* The trigger - what the user clicks to open the sheet */}
      <BottomSheetTrigger>
        <Text>Open Menu</Text>
      </BottomSheetTrigger>

      {/* The bottom sheet content */}
      <BottomSheetPortal snapPoints={['50%', '70%']}>
        <UserMenuBottomSheetContent 
          onSettingsPress={() => console.log('Settings clicked')}
          onSwitchOrgPress={() => console.log('Switch org clicked')}
        />
      </BottomSheetPortal>
    </BottomSheet>
  );
}
```

### Props

- `onSettingsPress?: () => void` - Callback when settings option is clicked
- `onSwitchOrgPress?: () => void` - Callback when switch organization is clicked

### Features

- Displays user avatar, name, and email at the top
- Settings navigation option
- Switch organization option
- Logout functionality with confirmation
- Automatically closes on item selection
- Smooth drag-to-dismiss gesture
- Dark/light mode support via theme colors

### Structure

The bottom sheet contains:

1. **User Section** - Avatar, display name, and email
2. **Menu Items**
   - Settings (with primary color accent)
   - Switch Organization (with green accent)
3. **Logout** - Destructive action (red accent)

All menu items have:
- Icon with colored background
- Text label
- Chevron indicator (except logout)
- Tap feedback
- Auto-close on selection

