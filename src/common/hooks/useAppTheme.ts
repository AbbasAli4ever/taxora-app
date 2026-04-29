import { useColorScheme } from 'react-native';
import { COLORS } from '@config/theme';

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark  = scheme === 'dark';

  return {
    isDark,
    colors: COLORS,
    scheme,
  };
}
