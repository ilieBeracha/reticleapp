/**
 * DirectionalChevron Component
 *
 * Automatically renders ChevronRight in LTR mode and ChevronLeft in RTL mode.
 * Use this instead of ChevronRight throughout the app to ensure proper RTL support.
 *
 * Usage:
 *   import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
 *   <DirectionalChevron size={16} color={colors.textMuted} />
 */

import { useRTL } from '@/hooks/ui/useRTL';
import type { LucideProps } from 'lucide-react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export type DirectionalChevronProps = LucideProps & {
  direction?: 'forward' | 'back';
};

export function DirectionalChevron(props: DirectionalChevronProps) {
  const { direction = 'forward' } = props;
  const { isRTL } = useRTL();

  function getIcon() {
    if (direction === 'forward' && !isRTL) return ChevronRight;
    if (direction === 'forward' && isRTL) return ChevronLeft;
    if (direction === 'back' && !isRTL) return ChevronRight;
    if (direction === 'back' && isRTL) return ChevronLeft;
    return ChevronRight;
  }
  const Icon = direction === 'forward' ? ChevronRight : ChevronLeft;
  return <Icon {...props} />;
}

export default DirectionalChevron;
