import { useRouter } from 'expo-router';

import { PlaceForm } from '@/components/place-form';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';

export default function NewPlaceScreen() {
  const router = useRouter();

  return (
    <Screen title={strings.place.newTitle} back>
      <PlaceForm onSaved={() => router.back()} />
    </Screen>
  );
}
