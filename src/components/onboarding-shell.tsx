import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { strings } from '@/constants/strings';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const ONBOARDING_STEPS = 8;

export function OnboardingShell({
  step,
  title,
  tagline,
  body,
  note,
  hero,
  topSlot,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  back = true,
  skipTo,
}: {
  step: number;
  title: string;
  tagline?: string;
  body: string;
  note?: string;
  hero?: ReactNode;
  /** Content rendered between the hero and the title/body text */
  topSlot?: ReactNode;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  back?: boolean;
  skipTo?: Href;
}) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Row between align="center" px="three" pt="one" style={styles.header}>
          {back ? (
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/onboarding/welcome')
              }
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={strings.common.back}
              style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}>
              <Icon name="chevron-back" size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          {skipTo ? (
            <Pressable
              onPress={() => router.replace(skipTo)}
              hitSlop={12}
              accessibilityRole="button"
              style={[styles.skipButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.skipText}>
                {strings.onboarding.skip}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
        </Row>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {hero ? (
            <View style={styles.heroContainer}>
              <View style={[styles.heroHalo, { backgroundColor: theme.accentSoft }]}>
                {hero}
              </View>
            </View>
          ) : null}

          {topSlot ? <View style={styles.childrenContainer}>{topSlot}</View> : null}

          <Stack gap="one" align="center" style={styles.textContainer}>
            {tagline ? (
              <ThemedText style={[styles.tagline, { color: theme.accent }]}>
                {tagline.toUpperCase()}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.title}>{title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
              {body}
            </ThemedText>
            {note ? (
              <Row
                gap="two"
                style={[
                  styles.noteBox,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <Icon name="information-circle-outline" size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.noteText}>
                  {note}
                </ThemedText>
              </Row>
            ) : null}
          </Stack>

          {children ? <View style={styles.childrenContainer}>{children}</View> : null}
        </ScrollView>

        <Stack gap="two" px="four" pb="three" style={styles.footer}>
          <AppButton label={primaryLabel} onPress={onPrimary} />
          {secondaryLabel && onSecondary ? (
            <AppButton label={secondaryLabel} variant="secondary" onPress={onSecondary} />
          ) : null}

          <Row center gap="one" pt="two" style={styles.dotsRow}>
            {Array.from({ length: ONBOARDING_STEPS }, (_, index) => {
              const active = index === step - 1;
              const completed = index < step - 1;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    active && styles.dotActive,
                    {
                      backgroundColor: active
                        ? theme.accent
                        : completed
                          ? theme.text
                          : theme.backgroundSelected,
                    },
                  ]}
                />
              );
            })}
          </Row>
        </Stack>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    minHeight: 48,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 38,
    height: 38,
  },
  skipButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
  },
  skipText: {
    fontWeight: '600',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  heroContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHalo: {
    padding: Spacing.three,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  noteBox: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth * 2,
    maxWidth: 340,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  childrenContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  footer: {
    paddingTop: Spacing.one,
  },
  dotsRow: {
    minHeight: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
  },
});
