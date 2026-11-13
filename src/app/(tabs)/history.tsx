import { PlaceholderScreen } from '@/components/placeholder-screen';
import { strings } from '@/constants/strings';

export default function HistoryScreen() {
  return (
    <PlaceholderScreen
      title={strings.history.title}
      subtitle={strings.history.emptyTitle}
      note={`${strings.history.emptyBody} Arrives in Phase 8.`}
    />
  );
}
