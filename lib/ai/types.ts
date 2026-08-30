export interface VoiceTranscriptionResult {
  text: string;
  provider: string;
  latencyMs: number;
}

export interface ReasoningResult {
  text: string;
  provider: string;
  latencyMs: number;
}

export type VoiceProviderName = 'addis' | 'google' | 'whisper';
export type ReasoningProviderName = 'primary' | 'groq' | 'openrouter' | 'primaryBackup';

export interface VoiceProvider {
  name: VoiceProviderName;
  transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult>;
}

export interface ReasoningProvider {
  name: ReasoningProviderName;
  complete(prompt: string): Promise<ReasoningResult>;
}