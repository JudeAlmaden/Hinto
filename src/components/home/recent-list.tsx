import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionLabel } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row } from '@/components/ui/layout';
import { strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import type { RecentDestination } from '@/modules/places';
import { formatAge } from '@/utils/format';

export function RecentList({
  recent,
  onOpen,
}: {
  recent: RecentDestination[];
  onOpen: (item: RecentDestination) => void;
}) {
  const theme = useTheme();

  if (recent.length === 0) return null;

  return (
    <>
      <SectionLabel>{strings.home.recentHeading}</SectionLabel>
      {recent.map((item) => (
        <Row
          key={`${item.name}-${item.latitude}`}
          gap="two"
          py="three"
          onPress={() => onOpen(item)}
          style={styles.divider}>
          <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="time-outline" size={16} themeColor="textSecondary" />
          </View>
          <ThemedText style={styles.name} numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatAge(item.lastUsedAt)} ›
          </ThemedText>
        </Row>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
