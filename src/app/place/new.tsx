import { useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceForm } from '@/components/place-form';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';

export default function NewPlaceScreen() {
  const router = useRouter();
  // The pin picker can hand over the dropped point so it only needs a name.
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const initialCoordinates =
    isValidLatitude(latitude) && isValidLongitude(longitude)
      ? { latitude, longitude }
      : undefined;

  return (
    <Screen title={strings.place.newTitle} back>
      <PlaceForm initialCoordinates={initialCoordinates} onSaved={() => router.back()} />
    </Screen>
  );
}
