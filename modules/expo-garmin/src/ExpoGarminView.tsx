import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoGarminViewProps } from './ExpoGarmin.types';

const NativeView: React.ComponentType<ExpoGarminViewProps> =
  requireNativeView('ExpoGarmin');

export default function ExpoGarminView(props: ExpoGarminViewProps) {
  return <NativeView {...props} />;
}
