import { ThemedText } from '@/components/themed-text';
import { AppButton, Card } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { PlaceIcon } from '@/components/ui/place';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/modules/places';
import type { DistanceUnit } from '@/modules/settings/schema';
import { formatDistance } from '@/utils/format';

export function NextStopCard({
  place,
  distanceM,
  unit,
  onStart,
}: {
  place: Place;
  /** Live distance to the place, or null before the first GPS fix. */
  distanceM: number | null;
  unit: DistanceUnit;
  onStart: () => void;
}) {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { borderColor: theme.accentBorder }]}>
      <Row gap="three">
        <PlaceIcon category={place.category} icon={place.icon} color={place.color} size={56} />
        <Stack gap="half" flex>
          <ThemedText style={styles.name} numberOfLines={2}>
            {place.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {strings.place.categories[place.category]}
            {distanceM !== null
              ? `, ${formatDistance(distanceM, unit)} ${strings.journey.toGo}`
              : `, ${strings.home.alarmAt} ${formatDistance(place.defaultRadiusM, unit)}`}
          </ThemedText>
        </Stack>
      </Row>
      <AppButton label={strings.home.startJourney} onPress={onStart} />
    </Card>
  );
}

const styles = {
  card: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
} as const;
