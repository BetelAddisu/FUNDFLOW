import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

export class WhisperVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'whisper';

  async transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const ext = mimeType?.split('/')[1]?.split(';')[0] || 'webm';
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(audio)], { type: mimeType || 'audio/webm' }), `audio.${ext}`);
    formData.append('model', 'whisper-1');
    if (language && language !== 'om') formData.append('language', language);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper transcription failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.text;
    if (!text) throw new Error('Whisper returned no transcription text');

    return {
      text,
      provider: this.name,
      latencyMs: 0,
    };
  }
}