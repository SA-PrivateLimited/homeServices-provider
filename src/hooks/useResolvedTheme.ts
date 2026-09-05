import {useMemo} from 'react';
import {useStore} from '../store';
import {resolveTheme, type Theme} from '../utils/theme';

/** Live Partner theme — night vision surfaces + branded accents (web parity). */
export function useResolvedTheme(): Theme {
  const {isDarkMode, colorTheme} = useStore();
  return useMemo(
    () => resolveTheme(isDarkMode),
    // colorTheme mutates accents in place; depend on it so UI refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDarkMode, colorTheme],
  );
}
