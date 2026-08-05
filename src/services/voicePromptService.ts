/**
 * Short voice prompts for field providers (TTS).
 * Graceful no-op if react-native-tts is missing / not linked yet.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_ENABLED_KEY = '@hs_provider_voice_prompts';

let ttsModule: any = null;
let loadAttempted = false;

function getTts(): any | null {
  if (loadAttempted) return ttsModule;
  loadAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ttsModule = require('react-native-tts').default;
  } catch {
    ttsModule = null;
  }
  return ttsModule;
}

export async function isVoicePromptsEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(VOICE_ENABLED_KEY);
    if (v == null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

export async function setVoicePromptsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(VOICE_ENABLED_KEY, enabled ? '1' : '0');
}

export async function speakPrompt(text: string): Promise<void> {
  try {
    const enabled = await isVoicePromptsEnabled();
    if (!enabled) return;
    const Tts = getTts();
    if (!Tts) return;
    try {
      await Tts.stop();
    } catch {
      /* ignore */
    }
    Tts.setDefaultLanguage?.('en-IN');
    Tts.setDefaultRate?.(0.48);
    await Tts.speak(text);
  } catch (e) {
    console.warn('[voice] speak failed', e);
  }
}

export async function speakNewJobReceived(): Promise<void> {
  await speakPrompt('New job received');
}

export async function speakNavigateToCustomer(): Promise<void> {
  await speakPrompt('Navigate to customer');
}
