import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-appearance';
import { useTheme } from '@/hooks/use-theme';

export interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Show the Hinto wordmark instead of a text title. */
  logo?: boolean;
  back?: boolean;
  right?: ReactNode;
  /** Extra block under the title row (greeting, next action, etc.). */
  headerContent?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  /** Extra bottom space so tab screens clear the native tab bar. */
  tabInset?: boolean;
}

/** SafeArea + max width + optional header and sticky footer (wireframes §3). */
export function Screen({
  title,
  subtitle,
  logo = false,
  back = false,
  right,
  headerContent,
  children,
  scroll = true,
  footer,
  tabInset = false,
}: ScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const showsHeader = Boolean(title || back || right || logo || headerContent);

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        tabInset ? styles.tabInset : null,
        footer ? styles.scrollWithFooter : null,
      ]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.fill}>{children}</View>
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {showsHeader ? (
          <View style={styles.header}>
            {back ? (
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
                <Icon name="chevron-back" size={26} themeColor="text" />
              </Pressable>
            ) : null}
            <View style={styles.headerText}>
              {logo ? (
                <Image
                  source={
                    scheme === 'dark'
                      ? require('@/assets/images/logo-dark.png')
                      : require('@/assets/images/logo-light.png')
                  }
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel={strings.appName}
                />
              ) : null}
              {title ? (
                <ThemedText style={styles.title} numberOfLines={1}>
                  {title}
                </ThemedText>
              ) : null}
              {subtitle ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>
            {right}
          </View>
        ) : null}

        {headerContent ? <View style={styles.headerExtra}>{headerContent}</View> : null}

        {body}

        {footer ? (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, Spacing.two) + Spacing.one,
              },
            ]}>
            {footer}
          </View>
        ) : null}
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
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 30,
    lineHeight: 34,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  headerExtra: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  logo: {
    width: 124,
    height: 66,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  scrollWithFooter: {
    paddingBottom: Spacing.three,
  },
  tabInset: {
    paddingBottom: 116,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
