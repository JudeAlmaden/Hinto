import { PlaceholderScreen } from '@/components/placeholder-screen';
import { strings } from '@/constants/strings';

export default function HomeScreen() {
  return (
    <PlaceholderScreen
      title={strings.appName}
      subtitle={strings.tagline}
      note={`${strings.home.searchPlaceholder} — journey planning arrives in Phase 7.`}
    />
  );
}
