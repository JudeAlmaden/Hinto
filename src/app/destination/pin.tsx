import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PinMap } from '@/components/pin-map';
import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, TextField } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { currentLocation } from '@/modules/location/service';
import { offlinePinLabel, type PinPoint } from '@/modules/maps';
import { useSettings } from '@/hooks/use-settings';
import { formatCoordinates } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';

const FALLBACK: PinPoint = { latitude: 14.5995, longitude: 120.9842 };

/** Best effort only; a pin name must never block the flow (D17). */
async function suggestName(latitude: number, longitude: number): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return null;
    const parts = [place.name, place.street, place.district, place.city].filter(
      (part): part is string => Boolean(part),
    );
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : null;
  } catch {
    return null;
  }
}

export default function PinDestinationScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const [mode, setMode] = useState<'map' | 'coordinates'>('map');
  const [center, setCenter] = useState<PinPoint>(FALLBACK);
  const [point, setPoint] = useState<PinPoint | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [mapFailed, setMapFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const savePlace = () => {
    if (!point) return;
    router.push({
      pathname: '/place/new',
      params: {
        latitude: point.latitude.toFixed(6),
        longitude: point.longitude.toFixed(6),
      },
    });
  };

  const choose = async () => {
    const latitude = Number(latitudeText.trim());
    const longitude = Number(longitudeText.trim());

    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
      setError(strings.destination.invalidCoordinates);
      return;
    }

    const fallbackLabel = offlinePinLabel({ latitude, longitude });
    const suggested = await suggestName(latitude, longitude);

    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(
        {
          name: suggested ?? fallbackLabel,
          latitude,
          longitude,
          placeId: null,
        },
        settings.default_radius_m || DEFAULT_RADIUS_M,
      ),
    });
  };

  return (
    <Screen title={strings.destination.pinTitle} back>
      {mode === 'map' ? (
        <PinMap
          key={mapKey}
          center={center}
          pin={point}
          onPick={(next) => {
            applyPoint(next);
            setError(null);
          }}
          onFailure={failMap}
          style={styles.map}
        />
      ) : (
        <Card style={styles.coordinates}>
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
        </Card>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {mode === 'map' ? strings.destination.pinHint : strings.destination.attribution}
      </ThemedText>

      <View style={styles.actions}>
        <AppButton
          label={locating ? strings.common.loading : strings.destination.recenter}
          variant="secondary"
          onPress={() => void locate()}
          style={styles.action}
        />
        <AppButton
          label={mode === 'map' ? strings.destination.coordinateEntry : strings.destination.showMap}
          variant="ghost"
          onPress={mode === 'map' ? () => setMode('coordinates') : showMap}
          style={styles.action}
        />
      </View>

      {point ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.destination.pinLabel.replace(
            '{coordinates}',
            formatCoordinates(point.latitude, point.longitude),
          )}
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <AppButton label={strings.destination.usePoint} onPress={() => void choose()} />
      <AppButton
        label={strings.destination.savePlace}
        variant="secondary"
        onPress={savePlace}
        disabled={!point}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 360,
    borderRadius: Radii.large,
  },
  coordinates: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  error: {
    color: '#E5484D',
  },
});
