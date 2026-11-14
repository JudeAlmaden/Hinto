import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place, PlaceCategory } from '@/modules/places';
import { defaultIconFor } from '@/modules/places/icons';
import { formatDistance } from '@/utils/format';

export function PlaceIcon({
  category,
  icon,
  size = 44,
  color,
}: {
  category: PlaceCategory;
  icon?: string | null;
  size?: number;
  color?: string | null;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: Radii.medium,
          backgroundColor: color ?? theme.backgroundSelected,
        },
      ]}>
      <ThemedText style={{ fontSize: size * 0.46 }}>{icon ?? defaultIconFor(category)}</ThemedText>
    </View>
  );
}

export function PlaceCard({
  place,
  distanceM,
  unit = 'km',
  onPress,
  onLongPress,
  showCategory = true,
}: {
  place: Place;
  distanceM?: number | null;
  unit?: 'km' | 'mi';
  onPress: () => void;
  onLongPress?: () => void;
  showCategory?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <PlaceIcon category={place.category} icon={place.icon} color={place.color} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {place.name}
          {place.isFavorite ? ' ★' : ''}
        </ThemedText>
        {showCategory ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {strings.place.categories[place.category]}
            {distanceM !== undefined && distanceM !== null
              ? ` · ${formatDistance(distanceM, unit)}`
              : ''}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {formatCopy(strings.places.alertsAt, {
          distance: formatDistance(place.defaultRadiusM, unit),
        })}{' '}
        ›
      </ThemedText>
    </Pressable>
  );
}

export function DestinationCard({
  name,
  subtitle,
  onPress,
  onLongPress,
}: {
  name: string;
  subtitle?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 },
      ]}>
      <ThemedView type="backgroundElement" style={styles.pin}>
        <ThemedText type="small">📍</ThemedText>
      </ThemedView>
      <View style={styles.text}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {name}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
