import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

export class AddisVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'addis';

  async transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
    if (language === 'en') {
      throw new Error('Addis AI does not support English -- skip to the next provider');
    }

    const apiKey = process.env.ADDIS_AI_API_KEY;
    if (!apiKey) throw new Error('ADDIS_AI_API_KEY is not set');

    const targetLanguage = language === 'om' ? 'om' : 'am';

    const formData = new FormData();
    formData.append(
      'request_data',
      JSON.stringify({ target_language: targetLanguage })
    );
    formData.append(
      'chat_audio_input',
      new Blob([new Uint8Array(audio)], { type: mimeType || 'audio/webm' }),
      'audio'
    );

    const response = await fetch('https://platform.addisassistant.com/chat_generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Addis AI transcription failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.transcript || data.text || data.response || data.result?.text;
    if (!text) throw new Error('Addis AI returned no recognizable transcript field -- verify current response shape at platform.addisassistant.com/docs');

    return { text, provider: this.name, latencyMs: 0 };
  }
}