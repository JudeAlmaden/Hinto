import { PlaceholderScreen } from '@/components/placeholder-screen';
import { strings } from '@/constants/strings';

export default function SettingsScreen() {
  return (
    <PlaceholderScreen
      title={strings.settings.title}
      note={`${strings.settings.defaultRadius}, sound and permissions arrive in Phases 8–9.`}
    />
  );
}
