/**
 * RTL (Right-to-Left) Support Hook
 *
 * Provides utilities for dynamic RTL layout handling without requiring app restart.
 * Use this hook in components that need RTL-aware styling.
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type TextAlign = 'left' | 'right' | 'center' | 'auto' | 'justify';

interface RTLStyles {
  /** Flips 'row' to 'row-reverse' when RTL */
  row: ViewStyle;
  /** Text alignment based on direction */
  text: TextStyle;
  /** For section margins/paddings - start side */
  marginStart: (value: number) => ViewStyle;
  /** For section margins/paddings - end side */
  marginEnd: (value: number) => ViewStyle;
  /** Flex direction that respects RTL */
  flexRow: ViewStyle;
  /** Flex direction reversed that respects RTL */
  flexRowReverse: ViewStyle;
}

export function useRTL() {
  const { isRTL, language } = useLanguage();

  const styles = useMemo((): RTLStyles => ({
    row: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
    text: {
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    marginStart: (value: number) => ({
      [isRTL ? 'marginRight' : 'marginLeft']: value,
    }),
    marginEnd: (value: number) => ({
      [isRTL ? 'marginLeft' : 'marginRight']: value,
    }),
    flexRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
    flexRowReverse: {
      flexDirection: isRTL ? 'row' : 'row-reverse',
    },
  }), [isRTL]);

  /**
   * Returns the appropriate chevron icon name based on direction
   */
  const chevron = useMemo(() => ({
    forward: isRTL ? 'chevron-back' : 'chevron-forward',
    back: isRTL ? 'chevron-forward' : 'chevron-back',
  }), [isRTL]);

  /**
   * Returns the appropriate arrow icon name based on direction
   */
  const arrow = useMemo(() => ({
    forward: isRTL ? 'arrow-back' : 'arrow-forward',
    back: isRTL ? 'arrow-forward' : 'arrow-back',
  }), [isRTL]);

  /**
   * Flips a flex direction for RTL
   */
  const flipDirection = (direction: FlexDirection): FlexDirection => {
    if (!isRTL) return direction;
    switch (direction) {
      case 'row':
        return 'row-reverse';
      case 'row-reverse':
        return 'row';
      default:
        return direction;
    }
  };

  /**
   * Flips text alignment for RTL
   */
  const flipTextAlign = (align: TextAlign): TextAlign => {
    if (!isRTL || align === 'center' || align === 'justify') return align;
    if (align === 'left') return 'right';
    if (align === 'right') return 'left';
    return align;
  };

  /**
   * Creates a conditional style that only applies in RTL mode
   */
  const rtlStyle = <T extends ViewStyle | TextStyle>(style: T): T | undefined => {
    return isRTL ? style : undefined;
  };

  /**
   * Creates a conditional style that only applies in LTR mode
   */
  const ltrStyle = <T extends ViewStyle | TextStyle>(style: T): T | undefined => {
    return isRTL ? undefined : style;
  };

  return {
    isRTL,
    language,
    styles,
    chevron,
    arrow,
    flipDirection,
    flipTextAlign,
    rtlStyle,
    ltrStyle,
  };
}
