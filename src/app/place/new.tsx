import { useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceForm } from '@/components/place-form';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';

export default function NewPlaceScreen() {
  const router = useRouter();
  // The pin picker and search results hand over the point and a suggested name.
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string; name?: string }>();
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const initialCoordinates =
    isValidLatitude(latitude) && isValidLongitude(longitude)
      ? { latitude, longitude }
      : undefined;
  const initialName = typeof params.name === 'string' && params.name.trim() ? params.name : undefined;

  return (
    <Screen title={strings.place.newTitle} back>
      <PlaceForm
        initialCoordinates={initialCoordinates}
        initialName={initialName}
        onSaved={(id) => router.replace({ pathname: '/place/[id]', params: { id, saved: '1' } })}
      />
    </Screen>
  );
}
