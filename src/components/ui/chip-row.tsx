import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';

/**
 * One row of chips that scrolls sideways instead of wrapping. `bleed` pulls the
 * scroller to the screen edge and re-adds the inset as content padding.
 */
export function ChipRow({
  children,
  bleed = false,
  style,
}: {
  children: ReactNode;
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[bleed && styles.bleed, style]}
      contentContainerStyle={[styles.content, bleed && styles.contentBleed]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: {
    marginHorizontal: -Spacing.three,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  contentBleed: {
    paddingHorizontal: Spacing.three,
  },
});
