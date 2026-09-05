import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'akanso.receiveRequestsPrompt.dismissed';

export async function isReceiveRequestsPromptDismissed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function dismissReceiveRequestsPrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}
