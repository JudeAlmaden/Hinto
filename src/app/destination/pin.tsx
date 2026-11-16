import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  type KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinMap } from '@/components/pin-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Row, Stack } from '@/components/ui/layout';
import { AppButton, TextField } from '@/components/ui/controls';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Icon } from '@/components/ui/icon';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { strings } from '@/constants/strings';
import { FontFamilies, Radii, Spacing } from '@/constants/theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { usePlaces } from '@/hooks/use-places';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { currentLocation } from '@/modules/location/service';
import { offlinePinLabel, type PinPoint } from '@/modules/maps';
import { suggestPlaceName } from '@/modules/maps/label';
import { SEARCH, searchPlacesOnline } from '@/modules/places/search';
import type { PlaceSearchResult } from '@/modules/places';
import { formatCoordinates, formatRadius } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';

const FALLBACK: PinPoint = { latitude: 14.5995, longitude: 120.9842 };
const SUGGEST_DEBOUNCE_MS = 500;

export default function PinDestinationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ intent?: string }>();
  const { settings } = useSettings();
  const { places } = usePlaces();
  const net = useNetInfo();
  const offline = net.isConnected === false;
  const paramIntent =
    params.intent === 'save' ? ('save' as const) : params.intent === 'journey' ? ('journey' as const) : null;
  // Entry points carry an intent; when none arrives the sheet lets the user pick.
  const [intent, setIntent] = useState<'save' | 'journey' | null>(paramIntent);
  const effectiveIntent = intent ?? 'journey';

  const [radius, setRadius] = useState<number>(settings.default_radius_m || DEFAULT_RADIUS_M);
  const [mode, setMode] = useState<'map' | 'coordinates'>('map');
  const [center, setCenter] = useState<PinPoint>(FALLBACK);
  const [point, setPoint] = useState<PinPoint | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPlace, setSavingPlace] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (offline || trimmed.length < SEARCH.minCharacters) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(() => {
      setSearchLoading(true);
      searchPlacesOnline(trimmed, { signal: controller.signal })
        .then((found) => {
          if (cancelled) return;
          setSearchResults(found);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, SEARCH.debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, offline]);

  const matchingPlaces =
    searchQuery.trim().length >= 1
      ? places.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      : [];

  const selectLocation = (loc: { latitude: number; longitude: number; name: string }) => {
    const next = { latitude: loc.latitude, longitude: loc.longitude };
    applyPoint(next);
    setCenter(next);
    setMapKey((value) => value + 1);
    setName(loc.name);
    setNameEdited(true);
    setError(null);
    setMode('map');
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    Keyboard.dismiss();
  };

  const applyPoint = (next: PinPoint) => {
    setPoint(next);
    setLatitudeText(next.latitude.toFixed(6));
    setLongitudeText(next.longitude.toFixed(6));
  };

  useEffect(() => {
    let active = true;
    void currentLocation().then((position) => {
      if (!active || !position) return;
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      applyPoint(next);
      setCenter(next);
      setMapKey((value) => value + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep the sheet's name in step with the map, unless the user typed one.
  useEffect(() => {
    if (mode !== 'map' || !point) return;
    let active = true;

    const timer = setTimeout(() => {
      // Reverse geocoding needs a connection; fall back to a plain pin label and
      // never leave the sheet sitting on "suggesting" offline.
      if (offline) {
        setName(offlinePinLabel(point));
        return;
      }
      if (active) setSuggesting(true);
      void suggestPlaceName(point.latitude, point.longitude)
        .then((suggested) => {
          if (!active || nameEdited) return;
          setName(suggested ?? offlinePinLabel(point));
        })
        .finally(() => {
          if (active) setSuggesting(false);
        });
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, point, nameEdited, offline]);

  const locate = async () => {
    setLocating(true);
    const position = await currentLocation();
    setLocating(false);
    if (!position) {
      setError(strings.destination.locationUnavailable);
      return;
    }
    const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    applyPoint(next);
    setCenter(next);
    setMapKey((value) => value + 1);
    setNameEdited(false);
    setError(null);
  };

  const failMap = () => {
    setMapFailed(true);
    setMode('coordinates');
  };

  const showMap = () => {
    setMapFailed(false);
    setError(null);
    setMapKey((value) => value + 1);
    setMode('map');
  };

  const resolvedName = () => {
    const typed = name.trim();
    if (typed) return typed;
    return point ? offlinePinLabel(point) : '';
  };

  const savePlace = async () => {
    if (!point || savingPlace) return;
    setSavingPlace(true);
    try {
      router.push({
        pathname: '/place/new',
        params: {
          latitude: point.latitude.toFixed(6),
          longitude: point.longitude.toFixed(6),
          name: resolvedName(),
        },
      });
    } finally {
      setSavingPlace(false);
    }
  };

  const choose = () => {
    if (!point) return;
    const { latitude, longitude } = point;
    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(
        { name: resolvedName(), latitude, longitude, placeId: null },
        radius,
      ),
    });
  };

  const applyCoordinates = () => {
    const latitude = Number(latitudeText.trim());
    const longitude = Number(longitudeText.trim());

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      setError(strings.destination.invalidCoordinates);
      return;
    }

    applyPoint({ latitude, longitude });
    setCenter({ latitude, longitude });
    setMapKey((value) => value + 1);
    setNameEdited(false);
    setError(null);
    setMode('map');
  };

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.mapArea, keyboardHeight > 0 && !searchFocused && styles.mapAreaCompact]}>
        {mode === 'map' ? (
          <PinMap
            key={mapKey}
            center={center}
            centerPin
            /* The circle is drawn at the live point, not the initial camera centre. */
            pin={point}
            radiusM={effectiveIntent === 'journey' ? radius : undefined}
            onPress={() => {
              Keyboard.dismiss();
              if (searchFocused) setSearchFocused(false);
            }}
            onCenterChange={(next) => {
              applyPoint(next);
              setError(null);
              if (searchFocused) setSearchFocused(false);
              Keyboard.dismiss();
            }}
            onFailure={failMap}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
        )}

        <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
          <Row gap="two" px="three" pt="two" pointerEvents="box-none" align="center">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={8}
              style={[styles.circle, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Icon name="chevron-back" size={22} themeColor="text" />
            </Pressable>

            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: searchFocused ? theme.accent : theme.border,
                },
              ]}>
              <Icon name="search" size={18} color={theme.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.trim().length < SEARCH.minCharacters) {
                    setSearchResults([]);
                    setSearchLoading(false);
                  }
                }}
                onFocus={() => setSearchFocused(true)}
                placeholder={strings.destination.searchPlaceholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchLoading ? (
                <ActivityIndicator size="small" color={theme.accent} style={styles.searchSpinner} />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  hitSlop={8}>
                  <Icon name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </Row>

          {searchFocused && (matchingPlaces.length > 0 || searchResults.length > 0 || searchLoading) ? (
            <View
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <ScrollView
                style={styles.dropdownScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {matchingPlaces.map((place) => (
                  <Pressable
                    key={`saved-${place.id}`}
                    onPress={() => selectLocation(place)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Icon name="bookmark" size={18} color={theme.accent} />
                    <View style={styles.dropdownText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {place.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {strings.destination.savedPlaces}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
                {searchResults.map((result) => (
                  <Pressable
                    key={`${result.name}-${result.latitude}-${result.longitude}`}
                    onPress={() => selectLocation(result)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <Icon name="location-outline" size={18} color={theme.textSecondary} />
                    <View style={styles.dropdownText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {result.name}
                      </ThemedText>
                      {result.subtitle ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {result.subtitle}
                        </ThemedText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </SafeAreaView>

        {mode === 'map' && (!keyboardHeight || searchFocused) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.destination.recenter}
            onPress={() => void locate()}
            style={[styles.fab, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Icon name={locating ? 'navigate' : 'locate'} size={20} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.keyboardWrap,
          keyboardHeight > 0 && !searchFocused && { paddingBottom: keyboardHeight },
        ]}>
        <BottomSheet style={styles.sheetContainer}>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={() => {
              if (searchFocused) {
                setSearchFocused(false);
                Keyboard.dismiss();
              }
            }}>
            {paramIntent === null ? (
              <SegmentedControl
                options={[
                  { value: 'journey', label: strings.destination.intentJourney },
                  { value: 'save', label: strings.destination.intentPlace },
                ]}
                value={effectiveIntent}
                onChange={setIntent}
              />
            ) : null}

            {offline ? (
              <ThemedText type="small" style={{ color: theme.warning }}>
                {strings.destination.offlineMap}
              </ThemedText>
            ) : null}

            {mode === 'map' ? (
              <ThemedText type="small" themeColor="textSecondary">
                {strings.destination.pinHint}
              </ThemedText>
            ) : (
              <Stack gap="two">
                <ThemedText type="small" themeColor="textSecondary">
                  {mapFailed ? strings.destination.mapFailed : strings.destination.coordinateHint}
                </ThemedText>
                <TextField
                  label={strings.destination.latitude}
                  value={latitudeText}
                  onChangeText={setLatitudeText}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
                <TextField
                  label={strings.destination.longitude}
                  value={longitudeText}
                  onChangeText={setLongitudeText}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
                <AppButton
                  label={strings.destination.applyCoordinates}
                  variant="secondary"
                  onPress={applyCoordinates}
                />
              </Stack>
            )}

            <TextField
              label={strings.place.name}
              value={name}
              onChangeText={(next) => {
                setName(next);
                setNameEdited(true);
              }}
              placeholder={suggesting ? strings.common.loading : strings.place.namePlaceholder}
              hint={point ? formatCoordinates(point.latitude, point.longitude) : undefined}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            {effectiveIntent === 'journey' ? (
              <Stack gap="one">
                <Row between align="center">
                  <ThemedText type="smallBold">
                    {strings.journeySetup.alertDistance}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatRadius(radius, settings.distance_unit)}
                  </ThemedText>
                </Row>
                <RadiusPicker value={radius} onChange={setRadius} unit={settings.distance_unit} />
              </Stack>
            ) : null}

            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {error}
              </ThemedText>
            ) : null}

            <AppButton
              label={
                effectiveIntent === 'save'
                  ? strings.destination.savePlace
                  : `${strings.destination.usePoint} (${formatRadius(radius, settings.distance_unit)})`
              }
              onPress={() => (effectiveIntent === 'save' ? void savePlace() : choose())}
              disabled={!point}
              loading={savingPlace}
            />

            <Row between pt="one">
              <Pressable
                onPress={() =>
                  effectiveIntent === 'save'
                    ? router.push({
                        pathname: '/journey/new',
                        params: journeySetupParams(
                          { name: resolvedName(), ...(point ?? FALLBACK), placeId: null },
                          radius,
                        ),
                      })
                    : void savePlace()
                }
                disabled={!point}>
                <ThemedText type="small" themeColor="textSecondary">
                  {effectiveIntent === 'save'
                    ? strings.destination.usePoint
                    : strings.destination.savePlace}
                </ThemedText>
              </Pressable>

              <Pressable onPress={mode === 'map' ? () => setMode('coordinates') : showMap}>
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'map' ? strings.destination.coordinateEntry : strings.destination.showMap}
                </ThemedText>
              </Pressable>
            </Row>
          </ScrollView>
        </BottomSheet>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  mapAreaCompact: {
    flex: 0,
    height: 150,
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FontFamilies.regular,
    paddingVertical: 0,
  },
  searchSpinner: {
    marginRight: Spacing.one,
  },
  dropdown: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: {
    flex: 1,
    gap: 2,
  },
  titlePill: {
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardWrap: {
    width: '100%',
  },
  sheetContainer: {
    maxHeight: 460,
    paddingHorizontal: 0,
    flexShrink: 1,
  },
  sheetScroll: {
    maxHeight: 420,
    flexShrink: 1,
  },
  sheetContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
