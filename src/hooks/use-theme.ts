import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-appearance';

export function useTheme() {
  return Colors[useResolvedScheme()];
}
