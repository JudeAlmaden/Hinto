import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, SectionLabel, TextField } from '@/components/ui/controls';
import { DestinationCard, PlaceCard } from '@/components/ui/place';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { usePlaces } from '@/hooks/use-places';
import { useSettings } from '@/hooks/use-settings';
import type { Destination, PlaceSearchResult } from '@/modules/places';
import { SEARCH, searchPlacesOnline } from '@/modules/places/search';
import { journeySetupParams } from '@/utils/navigation';

export default function DestinationSearchScreen() {
  const router = useRouter();
  const net = useNetInfo();
  const { places } = usePlaces();
  const { settings } = useSettings();

  const offline = net.isConnected === false;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (offline || trimmed.length < SEARCH.minCharacters) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);
      searchPlacesOnline(trimmed, { signal: controller.signal })
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setFailed(false);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH.debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, offline, nonce]);

  const choose = (destination: Destination, radiusM = settings.default_radius_m) => {
    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(destination, radiusM),
    });
  };

  return (
    <Screen title={strings.destination.title} back>
      <TextField
        value={query}
        onChangeText={(next) => {
          setQuery(next);
          setResults([]);
          setFailed(false);
          setLoading(false);
        }}
        placeholder={strings.destination.searchPlaceholder}
        autoFocus
        autoCorrect={false}
        editable={!offline}
      />

      {offline ? (
        <Card style={styles.notice}>
          <ThemedText type="smallBold">{strings.destination.offlineTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.destination.offlineBody}
          </ThemedText>
        </Card>
      ) : null}

      {loading ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      ) : null}

      {failed ? (
        <Card style={styles.notice}>
          <ThemedText type="small">{strings.common.unavailable}</ThemedText>
          <AppButton
            label={strings.common.retry}
            variant="secondary"
            onPress={() => setNonce((value) => value + 1)}
          />
        </Card>
      ) : null}

      {!offline && results.length > 0 ? (
        <>
          <SectionLabel>{strings.destination.results}</SectionLabel>
          <View>
            {results.map((result) => (
              <DestinationCard
                key={`${result.name}-${result.latitude}-${result.longitude}`}
                name={result.name}
                subtitle={result.subtitle}
                onPress={() =>
                  choose({
                    name: result.name,
                    latitude: result.latitude,
                    longitude: result.longitude,
                    placeId: null,
                  })
                }
              />
            ))}
          </View>
        </>
      ) : null}

      {!offline && !loading && !failed && query.trim().length >= SEARCH.minCharacters && results.length === 0 ? (
        <Card style={styles.notice}>
          <ThemedText type="smallBold">{strings.destination.noMatches}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.destination.noMatchesBody}
          </ThemedText>
        </Card>
      ) : null}

      {(offline || query.trim().length < SEARCH.minCharacters) && places.length > 0 ? (
        <>
          <SectionLabel>{strings.destination.savedPlaces}</SectionLabel>
          <View>
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                showCategory
                onPress={() =>
                  choose(
                    {
                      name: place.name,
                      latitude: place.latitude,
                      longitude: place.longitude,
                      placeId: place.id,
                    },
                    place.defaultRadiusM,
                  )
                }
              />
            ))}
          </View>
        </>
      ) : null}

      <AppButton
        label={strings.destination.dropPin}
        variant="secondary"
        onPress={() => router.push('/destination/pin')}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
        {offline ? strings.destination.offlineBody : strings.destination.attribution}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  attribution: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
