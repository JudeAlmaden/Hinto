import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReadinessIssue } from '@/modules/permissions';

export function ReadinessCard({
  issues,
  restrictionSuspected,
  onFix,
}: {
  issues: ReadinessIssue[];
  /** The OS looks like it is throttling background location. */
  restrictionSuspected: boolean;
  onFix: () => void;
}) {
  const theme = useTheme();
  // A suspected restriction is a real risk to the alarm, so it must not sit
  // under a "Ready to wake you" heading.
  const ready = issues.length === 0 && !restrictionSuspected;

  return (
    <Card style={styles.card}>
      <Stack gap="one">
        <Row gap="one" pb="half">
          <Icon
            name={ready ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={ready ? theme.success : theme.warning}
          />
          <ThemedText style={styles.title}>
            {ready ? strings.home.readinessReady : strings.home.readinessNeeds}
          </ThemedText>
        </Row>
        {ready && !restrictionSuspected ? (
          <ThemedText type="small" themeColor="textSecondary">
            {strings.home.readinessBody}
          </ThemedText>
        ) : null}
        {issues.slice(0, 3).map((issue) => (
          <Row key={issue.key} gap="two" py="one" onPress={onFix}>
            <ThemedText
              type="small"
              style={[
                styles.message,
                { color: issue.severity === 'blocking' ? theme.text : theme.textSecondary },
              ]}>
              {issue.key === 'locationServices' ? strings.home.locationsOff : issue.message}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.accent }}>
              {strings.home.fix}
            </ThemedText>
          </Row>
        ))}
        {restrictionSuspected ? (
          <Row gap="two" py="one" onPress={onFix}>
            <ThemedText type="small" style={[styles.message, { color: theme.warning }]}>
              {strings.home.batteryHint}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.accent }}>
              {strings.home.fix}
            </ThemedText>
          </Row>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = {
  card: {
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    flex: 1,
  },
} as const;
