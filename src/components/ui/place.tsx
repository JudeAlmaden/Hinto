import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icon } from '@/components/ui/icon';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place, PlaceCategory } from '@/modules/places';
import { resolvePlaceIcon } from '@/modules/places/icons';
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
      <Icon
        name={resolvePlaceIcon(icon, category)}
        size={Math.round(size * 0.5)}
        color={theme.text}
      />
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
        <View style={styles.nameRow}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {place.name}
          </ThemedText>
          {place.isFavorite ? <Icon name="star" size={14} color={theme.accent} /> : null}
        </View>
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
        })}
      </ThemedText>
      <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
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
        <Icon name="location-outline" size={18} color={theme.textSecondary} />
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
      <Icon name="chevron-forward" size={16} color={theme.textSecondary} />
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
