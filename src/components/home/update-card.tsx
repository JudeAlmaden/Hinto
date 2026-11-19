import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReleaseInfo } from '@/modules/updates';

/** Home's "new version" strip: one line of why, two actions, no modal. */
export function UpdateCard({
  release,
  current,
  onOpen,
  onDismiss,
}: {
  release: ReleaseInfo;
  current: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder },
      ]}>
      <Row gap="two">
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Icon name="cloud-download-outline" size={18} color={theme.accentText} />
        </View>
        <Stack gap="half" flex>
          <ThemedText style={styles.title}>
            {formatCopy(strings.updates.cardTitle, { version: release.version })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatCopy(strings.updates.cardBody, { current })}
          </ThemedText>
        </Stack>
      </Row>
      <Row gap="two" pt="one">
        <AppButton label={strings.updates.cardAction} onPress={onOpen} style={styles.action} />
        <AppButton
          label={strings.updates.cardDismiss}
          variant="ghost"
          onPress={onDismiss}
          style={styles.action}
        />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  action: {
    flex: 1,
  },
});
