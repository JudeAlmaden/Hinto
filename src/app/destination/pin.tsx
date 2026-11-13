import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { GoogleMaps } from 'expo-maps';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, TextField } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { Radii, Spacing } from '@/constants/theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { currentLocation } from '@/modules/location/service';
import { offlinePinLabel } from '@/modules/maps';
import { useSettings } from '@/hooks/use-settings';
import { formatCoordinates } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';

const FALLBACK = { latitude: 14.5995, longitude: 120.9842 };

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

  const apiKeyConfigured =
    (Constants.expoConfig?.extra as { googleMapsApiKeyConfigured?: boolean } | undefined)
      ?.googleMapsApiKeyConfigured === true;

  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [camera, setCamera] = useState(FALLBACK);
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [usingMap, setUsingMap] = useState(apiKeyConfigured && Platform.OS === 'android');

  useEffect(() => {
    void currentLocation().then((position) => {
      if (!position) return;
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCamera(next);
      setPoint((current) => current ?? next);
    });
  }, []);

  const applyPoint = (next: { latitude: number; longitude: number }) => {
    setPoint(next);
    setLatitudeText(next.latitude.toFixed(6));
    setLongitudeText(next.longitude.toFixed(6));
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
      {usingMap ? (
        <View style={styles.mapWrap}>
          <GoogleMaps.View
            key={mapKey}
            style={styles.map}
            cameraPosition={{ coordinates: camera, zoom: 14 }}
            markers={point ? [{ id: 'pin', coordinates: point }] : []}
            onMapClick={(event) => {
              const { latitude, longitude } = event.coordinates;
              if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
              applyPoint({ latitude, longitude });
              setError(null);
            }}
          />
          <View style={styles.mapFooter}>
            <ThemedText type="small" themeColor="textSecondary">
              {point ? strings.destination.pinHint : strings.destination.pinHint}
            </ThemedText>
            <View style={styles.mapActions}>
              <AppButton
                label={strings.destination.retryMap}
                variant="ghost"
                onPress={() => setMapKey((value) => value + 1)}
                style={styles.mapAction}
              />
              <AppButton
                label={strings.destination.coordinateEntry}
                variant="secondary"
                onPress={() => setUsingMap(false)}
                style={styles.mapAction}
              />
            </View>
          </View>
        </View>
      ) : (
        <Card style={styles.coordinates}>
          <ThemedText type="small" themeColor="textSecondary">
            {apiKeyConfigured ? strings.destination.mapFailed : strings.destination.mapUnavailable}
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
          {apiKeyConfigured ? (
            <AppButton
              label={strings.destination.retryMap}
              variant="ghost"
              onPress={() => setUsingMap(true)}
            />
          ) : null}
        </Card>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {point
          ? strings.destination.pinLabel.replace(
              '{coordinates}',
              formatCoordinates(point.latitude, point.longitude),
            )
          : strings.destination.pinHint}
      </ThemedText>

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <AppButton label={strings.destination.usePoint} onPress={() => void choose()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: Radii.large,
    overflow: 'hidden',
  },
  map: {
    height: 320,
    borderRadius: Radii.large,
  },
  mapFooter: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  mapActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mapAction: {
    flex: 1,
  },
  coordinates: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  error: {
    color: '#E5484D',
  },
});
