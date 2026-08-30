import { VoiceProvider, VoiceTranscriptionResult } from '../types';
import { AddisVoiceProvider } from './addis';
import { GoogleVoiceProvider } from './google';
import { WhisperVoiceProvider } from './whisper';

let voiceProviders: VoiceProvider[] = [
  new AddisVoiceProvider(),
  new GoogleVoiceProvider(),
  new WhisperVoiceProvider(),
];

export function setVoiceProviders(providers: VoiceProvider[]) {
  voiceProviders = providers;
}

export async function transcribeWithFallback(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
  const start = Date.now();
  for (const provider of voiceProviders) {
    try {
      const result = await provider.transcribe(audio, language, mimeType);
      result.latencyMs = Date.now() - start;
      result.provider = provider.name;
      return result;
    } catch (err) {
      console.warn(`Voice provider ${provider.name} failed:`, err);
    }
  }
  return {
    text: '',
    provider: 'unresolved',
    latencyMs: Date.now() - start,
  };
}

export function getVoiceProvider() {
  return {
    transcribe: transcribeWithFallback,
  };
}