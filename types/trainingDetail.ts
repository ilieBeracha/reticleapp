/**
 * Training Detail Types
 * Types for the read-only training summary view
 * 
 * NOTE: Training is a dashboard/context view only. 
 * All execution-related types have been removed.
 */

import type { useColors } from '@/hooks/ui/useColors';

// ═══════════════════════════════════════════════════════════════════════════
// COLOR TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type Colors = ReturnType<typeof useColors>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ═══════════════════════════════════════════════════════════════════════════

export interface TrainingHeroProps {
  training: any;
  colors: Colors;
  onAutoCloseExpired: () => void;
}

export interface AutoCloseCountdownProps {
  autoCloseAt: string;
  colors: Colors;
  onExpired: () => void;
}

export interface TrainingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  training: any;
  onUpdate: (data: any) => void;
  colors: Colors;
}
