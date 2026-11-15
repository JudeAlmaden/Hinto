import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppearance } from '@/modules/settings/appearance';

export function useResolvedScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const preference = useAppearance((state) => state.preference);

  if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
  return preference;
}
