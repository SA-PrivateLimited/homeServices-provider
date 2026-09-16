/**
 * Open https/http URLs safely on Android (emulator often has no browser;
 * hash fragments can break VIEW intents).
 */
import {Alert, Linking, Platform} from 'react-native';

/** Android Intent VIEW often fails with `#fragment` — strip for openURL. */
export function urlForExternalOpen(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return trimmed;
  const hash = trimmed.indexOf('#');
  if (hash >= 0 && Platform.OS === 'android') {
    return trimmed.slice(0, hash);
  }
  return trimmed;
}

export async function openExternalUrl(
  url: string,
  options?: {failTitle?: string; failMessage?: string},
): Promise<boolean> {
  const target = urlForExternalOpen(url);
  if (!target) return false;

  try {
    const can = await Linking.canOpenURL(target);
    if (!can) {
      Alert.alert(
        options?.failTitle || 'Cannot open link',
        options?.failMessage ||
          'No browser is available on this device. Try again on a phone with Chrome, or open the link later.',
      );
      return false;
    }
    await Linking.openURL(target);
    return true;
  } catch {
    Alert.alert(
      options?.failTitle || 'Cannot open link',
      options?.failMessage ||
        'Could not open this link. Install a browser or try again later.',
    );
    return false;
  }
}
