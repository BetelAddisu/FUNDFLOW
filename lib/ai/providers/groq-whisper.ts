import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

/**
 * Groq Whisper voice provider.
 * Uses Groq's OpenAI-compatible audio transcription API with whisper-large-v3-turbo.
 * Requires GROQ_API_KEY (already present in .env).
 * Supports: audio/webm, audio/mp4, audio/ogg, audio/wav, audio/m4a, audio/flac, audio/mp3.
 * Does NOT require conversion or base64 encoding — multipart form upload.
 */
export class GroqWhisperVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'groq-whisper';

  async transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    // Strip codec params (e.g. audio/webm;codecs=opus → audio/webm)
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    // Map MIME type to appropriate file extension for Groq
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'mp4',
      'audio/m4a': 'm4a',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/flac': 'flac',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
    };
    const ext = extMap[cleanMimeType] || 'webm';
    const filename = `voice-note.${ext}`;

    // Build multipart form using Node.js native FormData + Blob
    // Use Uint8Array to avoid Buffer<ArrayBufferLike> type mismatch
    const audioBlob = new Blob([new Uint8Array(audio)], { type: cleanMimeType });
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    // Pass language hint if not English (improves accuracy)
    if (language && language !== 'en') {
      // Groq whisper uses ISO-639-1 codes: am = Amharic, om = Oromo (not officially supported but worth trying)
      formData.append('language', language === 'am' ? 'am' : language === 'om' ? 'om' : language);
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Whisper failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as { text?: string };
    const text = data.text?.trim();
    if (!text) throw new Error('Groq Whisper returned empty transcription');

    return {
      text,
      provider: this.name,
      latencyMs: 0,
    };
  }
}
