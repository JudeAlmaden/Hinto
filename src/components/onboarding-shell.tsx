import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { strings } from '@/constants/strings';
import { MaxContentWidth, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const ONBOARDING_STEPS = 8;

export function OnboardingShell({
  step,
  title,
  body,
  note,
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
  body: string;
  note?: string;
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
        <Row gap="two" px="three" pt="two" style={styles.header}>
          {back ? (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ThemedText style={styles.back}>‹</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <View style={styles.headerSpacer} />
          {skipTo ? (
            <Pressable onPress={() => router.replace(skipTo)} hitSlop={12}>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.onboarding.skip}
              </ThemedText>
            </Pressable>
          ) : null}
        </Row>

        <ScrollView contentContainerStyle={styles.content}>
          {children}
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
            {body}
          </ThemedText>
          {note ? (
            <ThemedText type="small" themeColor="textSecondary">
              ⓘ {note}
            </ThemedText>
          ) : null}
        </ScrollView>

        <Stack gap="two" px="four" pb="three">
          <AppButton label={primaryLabel} onPress={onPrimary} />
          {secondaryLabel && onSecondary ? (
            <AppButton label={secondaryLabel} variant="ghost" onPress={onSecondary} />
          ) : null}

          <Row center gap="one" pt="two">
            {Array.from({ length: ONBOARDING_STEPS }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index < step ? theme.text : theme.backgroundSelected,
                  },
                ]}
              />
            ))}
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
    minHeight: 44,
  },
  back: {
    fontSize: 30,
    lineHeight: 34,
  },
  backSpacer: {
    width: 26,
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radii.pill,
  },
});
