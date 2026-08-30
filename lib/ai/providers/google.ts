import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

export class GoogleVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'google';

  async transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    // Convert audio to base64
    const audioBase64 = audio.toString('base64');
    const prompt = language
      ? `Transcribe the following audio in ${language}. Return only the transcription text.`
      : 'Transcribe the following audio. Return only the transcription text.';

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini transcription failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no transcription text');

    return {
      text: text.trim(),
      provider: this.name,
      latencyMs: 0,
    };
  }
}