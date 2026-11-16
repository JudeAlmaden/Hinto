import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinMap } from '@/components/pin-map';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Row, Stack } from '@/components/ui/layout';
import { AppButton, TextField } from '@/components/ui/controls';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Icon } from '@/components/ui/icon';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { currentLocation } from '@/modules/location/service';
import { offlinePinLabel, type PinPoint } from '@/modules/maps';
import { suggestPlaceName } from '@/modules/maps/label';
import { formatCoordinates } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';

const FALLBACK: PinPoint = { latitude: 14.5995, longitude: 120.9842 };
const SUGGEST_DEBOUNCE_MS = 500;

export default function PinDestinationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ intent?: string }>();
  const { settings } = useSettings();
  const paramIntent =
    params.intent === 'save' ? ('save' as const) : params.intent === 'journey' ? ('journey' as const) : null;
  // Entry points carry an intent; when none arrives the sheet lets the user pick.
  const [intent, setIntent] = useState<'save' | 'journey' | null>(paramIntent);
  const effectiveIntent = intent ?? 'journey';

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
  }, [mode, point, nameEdited]);

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
        settings.default_radius_m || DEFAULT_RADIUS_M,
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
      <View style={styles.mapArea}>
        {mode === 'map' ? (
          <PinMap
            key={mapKey}
            center={center}
            centerPin
            onCenterChange={(next) => {
              applyPoint(next);
              setError(null);
            }}
            onFailure={failMap}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
        )}

        <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
          <Row gap="two" px="three" pt="two" pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              hitSlop={8}
              style={[styles.circle, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Icon name="chevron-back" size={22} themeColor="text" />
            </Pressable>
            <View style={[styles.titlePill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {effectiveIntent === 'save'
                  ? strings.destination.saveTitle
                  : strings.destination.pinTitle}
              </ThemedText>
            </View>
          </Row>
        </SafeAreaView>

        {mode === 'map' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.destination.recenter}
            onPress={() => void locate()}
            style={[styles.fab, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Icon name={locating ? 'navigate' : 'locate'} size={20} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>

      <BottomSheet>
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
        />

        {error ? (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {error}
          </ThemedText>
        ) : null}

        <AppButton
          label={
            effectiveIntent === 'save' ? strings.destination.savePlace : strings.destination.usePoint
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
                      settings.default_radius_m || DEFAULT_RADIUS_M,
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
      </BottomSheet>
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
});
