import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlaceForm } from '@/components/place-form';
import { AppButton } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { usePlacesStore } from '@/modules/places/store';
import { journeySetupParams } from '@/utils/navigation';

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const places = usePlacesStore((state) => state.places);
  const load = usePlacesStore((state) => state.load);
  const remove = usePlacesStore((state) => state.remove);
  const duplicate = usePlacesStore((state) => state.duplicate);

  const place = places.find((candidate) => candidate.id === id) ?? null;

  useEffect(() => {
    void load();
  }, [load]);

  if (!place) {
    return (
      <Screen title={strings.place.editTitle} back>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      </Screen>
    );
  }

  const startJourney = () => {
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
    <Screen title={strings.place.editTitle} back>
      <PlaceForm initial={place} onSaved={() => router.back()} />

      <View style={styles.actions}>
        <AppButton label={strings.places.startJourney} onPress={startJourney} />
        <AppButton
          label={strings.places.duplicate}
          variant="secondary"
          onPress={() => {
            void duplicate(place.id).then((copy) => {
              if (copy) router.replace(`/place/${copy.id}`);
            });
          }}
        />
        <AppButton
          label={strings.place.delete}
          variant="ghost"
          onPress={() =>
            confirmAction({
              title: formatCopy(strings.place.deleteTitle, { name: place.name }),
              body: strings.place.deleteBody,
              confirmLabel: strings.place.delete,
              destructive: true,
              onConfirm: () => {
                void remove(place.id).then(() => router.back());
              },
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});
