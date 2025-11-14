# Bottom Sheet Usage Examples

## Slightly Open Bottom Sheet (Default Open at Init)

### Basic Usage

```tsx
import { SlightlyOpenBottomSheet } from "@/components/modals/bottomSheets";

export default function MyScreen() {
  return (
    <View>
      <Text>Main Content</Text>
      
      <SlightlyOpenBottomSheet>
        <Text>This content is slightly visible by default!</Text>
      </SlightlyOpenBottomSheet>
    </View>
  );
}
```

### Custom Snap Points

```tsx
<SlightlyOpenBottomSheet
  snapPoints={["15%", "40%", "80%"]} // Custom heights
  initialSnapIndex={0} // Opens at 15%
>
  <YourContent />
</SlightlyOpenBottomSheet>
```

### With Close Handler

```tsx
<SlightlyOpenBottomSheet
  snapPoints={["25%", "60%"]}
  initialSnapIndex={0}
  onClose={() => console.log("Sheet closed")}
>
  <YourContent />
</SlightlyOpenBottomSheet>
```

## Using the Gluestack UI Pattern Directly

If you need more control, use the gluestack components directly:

```tsx
import {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetContent,
  BottomSheetDragIndicator,
  BottomSheetBackdrop,
  BottomSheetTrigger,
} from "@/components/ui/bottomsheet";
import { Button } from "@/components/ui/button";

export default function MyScreen() {
  return (
    <BottomSheet>
      {/* Optional: Add a button to re-open if closed */}
      <BottomSheetTrigger>
        <Button>Open Sheet</Button>
      </BottomSheetTrigger>

      <BottomSheetPortal
        snapPoints={["20%", "50%", "90%"]}
        defaultIsOpen={true} // ✨ Opens by default
        snapToIndex={0} // Opens at first snap point (20%)
        handleComponent={BottomSheetDragIndicator}
        backdropComponent={BottomSheetBackdrop}
      >
        <BottomSheetContent>
          <Text>Your content here</Text>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
}
```

## Advanced: Programmatic Control

If you need to control the sheet programmatically after it's open:

```tsx
import { useRef, useEffect } from "react";
import { BottomSheet } from "@/components/ui/bottomsheet";
import GorhomBottomSheet from "@gorhom/bottom-sheet";

export default function AdvancedSheet() {
  const sheetRef = useRef<GorhomBottomSheet>(null);

  useEffect(() => {
    // Open to specific snap point after mount
    setTimeout(() => {
      sheetRef.current?.snapToIndex(0);
    }, 100);
  }, []);

  return (
    <BottomSheet>
      <BottomSheetPortal
        ref={sheetRef}
        snapPoints={["25%", "60%", "95%"]}
        defaultIsOpen={true}
        snapToIndex={0}
        handleComponent={BottomSheetDragIndicator}
        backdropComponent={BottomSheetBackdrop}
      >
        <BottomSheetContent>
          <Button onPress={() => sheetRef.current?.snapToIndex(2)}>
            Expand to Full
          </Button>
          <Button onPress={() => sheetRef.current?.close()}>
            Close
          </Button>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
}
```

## Common Snap Point Configurations

### Peek View (Slightly Open)
```tsx
snapPoints={["15%", "50%", "90%"]}
initialSnapIndex={0} // Shows just a peek at 15%
```

### Quarter Open
```tsx
snapPoints={["25%", "60%", "95%"]}
initialSnapIndex={0} // Opens at 25%
```

### Third Open
```tsx
snapPoints={["33%", "66%", "95%"]}
initialSnapIndex={0} // Opens at 33%
```

### Just Handle Visible
```tsx
snapPoints={["10%", "40%", "80%"]}
initialSnapIndex={0} // Shows just handle + small peek
```

## Tips

1. **First snap point** = Initial visible height when `defaultIsOpen={true}`
2. **Drag indicator** = The little handle users can drag
3. **Backdrop** = Semi-transparent background (appears on expand)
4. Use `enablePanDownToClose={true}` to allow closing by swiping down
5. Add `BottomSheetScrollView` for scrollable content

## What Changed?

The `BottomSheetPortal` component now supports:
- `defaultIsOpen` prop (boolean) - Whether to show the sheet on mount
- `snapToIndex` prop (number) - Which snap point to open to initially

Before: Sheet was always closed (`index={-1}`)
After: Sheet can open to any snap point on mount

