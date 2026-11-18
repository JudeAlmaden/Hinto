import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Mascot, type MascotPose } from '@/components/ui/mascot';
import { ThemedView } from '@/components/themed-view';
import { FontFamilies, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  const backgroundColor =
    variant === 'primary'
      ? theme.accent
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';

  const textColor =
    variant === 'primary'
      ? theme.accentText
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'dangerGhost'
          ? theme.danger
          : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          borderColor: variant === 'ghost' || variant === 'dangerGhost' ? theme.border : 'transparent',
          borderWidth: variant === 'ghost' || variant === 'dangerGhost' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.buttonLabel, { color: textColor }]}>{label}</ThemedText>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label?: string; hint?: string; error?: string | null }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: error ? theme.danger : focused ? theme.accent : 'transparent',
            borderWidth: error || focused ? 1 : 0,
          },
          props.style,
        ]}
      />
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
        {children}
      </ThemedText>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

export function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

export function NavRow({
  label,
  value,
  onPress,
  danger = false,
  last = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.navRow,
        !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && onPress ? { opacity: 0.6 } : null,
      ]}>
      <ThemedText style={[styles.navLabel, danger && { color: theme.danger }]}>{label}</ThemedText>
      {value ? (
        <ThemedText type="small" themeColor="textSecondary">
          {value}
        </ThemedText>
      ) : null}
      {onPress ? <Icon name="chevron-forward" size={16} themeColor="textSecondary" /> : null}
    </Pressable>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  last = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.navRow,
        !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
      <View style={styles.toggleText}>
        <ThemedText style={styles.navLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.backgroundSelected, true: theme.accentSoft }}
        thumbColor={value ? theme.accent : undefined}
      />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.backgroundElement,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <ThemedText
        type="small"
        style={{ color: selected ? theme.background : theme.text, fontWeight: '600' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  pose,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  pose?: MascotPose;
}) {
  return (
    <View style={styles.empty}>
      {pose ? <Mascot pose={pose} height={132} /> : null}
      <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
      {body ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
          {body}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontFamily: FontFamilies.medium,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: Radii.large,
    paddingHorizontal: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  navRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  chip: {
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: Spacing.one,
  },
});
