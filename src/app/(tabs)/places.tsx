import { PlaceholderScreen } from '@/components/placeholder-screen';
import { strings } from '@/constants/strings';

export default function PlacesScreen() {
  return (
    <PlaceholderScreen
      title={strings.places.title}
      subtitle={strings.places.emptyTitle}
      note={`${strings.places.emptyBody} Arrives in Phase 2.`}
    />
  );
}
