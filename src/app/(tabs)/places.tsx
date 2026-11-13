import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip, EmptyState, SectionLabel, TextField } from '@/components/ui/controls';
import { PlaceCard } from '@/components/ui/place';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { usePlaces } from '@/hooks/use-places';
import { useSettings } from '@/hooks/use-settings';
import { PLACE_CATEGORIES, type PlaceCategory } from '@/modules/places';
import { journeySetupParams } from '@/utils/navigation';

type Filter = 'all' | PlaceCategory;

export default function PlacesScreen() {
  const router = useRouter();
  const { places, loading, error } = usePlaces();
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return places.filter((place) => {
      if (filter !== 'all' && place.category !== filter) return false;
      if (!needle) return true;
      return place.name.toLowerCase().includes(needle);
    });
  }, [places, query, filter]);

  const favourites = filtered.filter((place) => place.isFavorite);
  const others = filtered.filter((place) => !place.isFavorite);

  const startJourney = (placeId: string) => {
    const place = places.find((candidate) => candidate.id === placeId);
    if (!place) return;
    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(
        {
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeId: place.id,
        },
        place.defaultRadiusM,
      ),
    });
  };

  return (
    <Screen
      title={strings.places.title}
      tabInset
      right={
        <Pressable onPress={() => router.push('/place/new')} hitSlop={12}>
          <ThemedText style={styles.plus}>+</ThemedText>
        </Pressable>
      }>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={strings.places.searchPlaceholder}
        autoCorrect={false}
      />

      <View style={styles.chips}>
        <Chip label={strings.places.all} selected={filter === 'all'} onPress={() => setFilter('all')} />
        {PLACE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={strings.place.categories[category]}
            selected={filter === category}
            onPress={() => setFilter(category)}
          />
        ))}
      </View>

      {loading && places.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      ) : error ? (
        <ThemedText type="small" themeColor="textSecondary">
          {error}
        </ThemedText>
      ) : places.length === 0 ? (
        <EmptyState
          title={strings.places.emptyTitle}
          body={strings.places.emptyBody}
          actionLabel={strings.places.addPlace}
          onAction={() => router.push('/place/new')}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title={strings.places.filterEmpty} body={strings.places.emptyBody} />
      ) : (
        <>
          {favourites.length > 0 ? (
            <>
              <SectionLabel>{strings.places.favourites}</SectionLabel>
              <View>
                {favourites.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    unit={settings.distance_unit}
                    onPress={() => router.push(`/place/${place.id}`)}
                    onLongPress={() => startJourney(place.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {others.length > 0 ? (
            <>
              <SectionLabel>{strings.places.all}</SectionLabel>
              <View>
                {others.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    unit={settings.distance_unit}
                    onPress={() => router.push(`/place/${place.id}`)}
                    onLongPress={() => startJourney(place.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {strings.places.longPressHint}
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  plus: {
    fontSize: 26,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
