import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { PlaceIcon } from '@/components/ui/place';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/modules/places';
import type { DistanceUnit } from '@/modules/settings/schema';
import { formatDistance } from '@/utils/format';

export function SavedPlaces({
  places,
  unit,
  onOpen,
  onAdd,
}: {
  places: Place[];
  unit: DistanceUnit;
  onOpen: (place: Place) => void;
  onAdd: () => void;
}) {
  const theme = useTheme();

  return (
    <Row wrap gap="two" align="stretch">
      {places.slice(0, 3).map((place) => (
        <Stack
          key={place.id}
          align="flex-start"
          gap="two"
          onPress={() => onOpen(place)}
          style={[
            styles.tile,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <PlaceIcon category={place.category} icon={place.icon} color={place.color} size={40} />
          <ThemedText style={styles.name} numberOfLines={2}>
            {place.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.subtitle}>
            {strings.place.categories[place.category]},{' '}
            {formatCopy(strings.place.distanceAway, {
              distance: formatDistance(place.defaultRadiusM, unit),
            })}
          </ThemedText>
        </Stack>
      ))}

      <Stack
        align="flex-start"
        gap="two"
        onPress={onAdd}
        style={[styles.tile, styles.addTile, { borderColor: theme.border }]}>
        <Stack center style={[styles.addIcon, { backgroundColor: theme.accentSoft }]}>
          <Icon name="add" size={20} color={theme.accent} />
        </Stack>
        <ThemedText style={styles.name}>{strings.home.addTile}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.home.addTileHint}
        </ThemedText>
      </Stack>
    </Row>
  );
}

const styles = {
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 128,
    padding: Spacing.two + 4,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden' as const,
  },
  addTile: {
    borderStyle: 'dashed' as const,
    borderWidth: 1,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  name: {
    fontSize: 15,
    fontWeight: '700' as const,
    width: '100%' as const,
  },
  subtitle: {
    width: '100%' as const,
  },
} as const;
