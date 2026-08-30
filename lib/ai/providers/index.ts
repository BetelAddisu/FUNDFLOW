import { VoiceProvider, VoiceTranscriptionResult } from '../types';
import { AddisVoiceProvider } from './addis';
import { GoogleVoiceProvider } from './google';
import { GroqWhisperVoiceProvider } from './groq-whisper';

let voiceProviders: VoiceProvider[] = [
  new GroqWhisperVoiceProvider(), // Primary: Groq Whisper (fast, supports webm/mp4/ogg natively, GROQ_API_KEY)
  new AddisVoiceProvider(),       // Secondary: Addis AI for Amharic/Oromo (skips English)
  new GoogleVoiceProvider(),      // Tertiary: Gemini (base64 inline, used as last resort)
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