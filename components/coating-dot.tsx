import { View } from 'react-native';

import { getCoatingDotColor } from '@/lib/coating-color';

type CoatingDotProps = {
  coating?: string | null;
  size?: number;
};

export function CoatingDot({ coating, size = 10 }: CoatingDotProps) {
  const color = getCoatingDotColor(coating);
  if (!color) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}
