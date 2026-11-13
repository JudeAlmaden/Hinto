import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const HOLD_DURATION_MS = 1500;

/**
 * Press-and-hold confirmation (plan D4).
 *
 * Releasing early cancels with no side effect; the progress bar fills under the
 * finger. A plain tap version is used when "prevent accidental dismissal" is off.
 */
export function HoldButton({
  label,
  onConfirm,
  disabled = false,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);
  const confirmed = useRef(false);

  const stop = () => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    if (!confirmed.current) setProgress(0);
  };

  useEffect(() => stop, []);

  const start = () => {
    if (disabled) return;
    confirmed.current = false;
    startedAt.current = Date.now();
    setProgress(0);

    interval.current = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const next = Math.min(1, elapsed / HOLD_DURATION_MS);
      setProgress(next);

      if (next >= 1) {
        confirmed.current = true;
        if (interval.current) clearInterval(interval.current);
        interval.current = null;
        onConfirm();
      }
    }, 50);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={start}
      onPressOut={stop}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.accent,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        },
      ]}>
      <ThemedText style={[styles.label, { color: theme.accentText }]}>{label}</ThemedText>
      <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.accentText },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 60,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
  },
  track: {
    alignSelf: 'stretch',
    height: 5,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
