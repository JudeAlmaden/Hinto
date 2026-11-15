import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlaceForm } from '@/components/place-form';
import { Card } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { MoreMenu } from '@/components/ui/more-menu';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { usePlacesStore } from '@/modules/places/store';
import { journeySetupParams } from '@/utils/navigation';

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; saved?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const justSaved = params.saved === '1';

  const places = usePlacesStore((state) => state.places);
  const load = usePlacesStore((state) => state.load);
  const remove = usePlacesStore((state) => state.remove);

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

  const confirmDelete = () =>
    confirmAction({
      title: formatCopy(strings.place.deleteTitle, { name: place.name }),
      body: strings.place.deleteBody,
      confirmLabel: strings.place.delete,
      destructive: true,
      onConfirm: () => {
        void remove(place.id).then(() => router.back());
      },
    });

  return (
    <Screen
      title={strings.place.editTitle}
      back
      right={
        <MoreMenu
          items={[
            { label: strings.place.delete, icon: 'trash-outline', destructive: true, onPress: confirmDelete },
          ]}
        />
      }>
      {justSaved ? (
        <Card style={styles.savedBanner}>
          <ThemedText type="smallBold">{strings.place.savedBanner}</ThemedText>
        </Card>
      ) : null}

      <PlaceForm
        initial={place}
        onSaved={() => router.back()}
        secondaryAction={{ label: strings.places.startJourney, onPress: startJourney }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  savedBanner: {
    paddingVertical: Spacing.three,
  },
});
