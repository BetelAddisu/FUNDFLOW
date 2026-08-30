import { VoiceProvider, VoiceTranscriptionResult, VoiceProviderName } from '../types';

export class GoogleVoiceProvider implements VoiceProvider {
  name: VoiceProviderName = 'google';

  async transcribe(audio: Buffer, language?: string, mimeType?: string): Promise<VoiceTranscriptionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    // Strip parameters like ;codecs=opus from mimeType for Gemini REST API compatibility
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    // Convert audio to base64
    const audioBase64 = audio.toString('base64');
    const prompt =
      language && language !== 'en'
        ? `Transcribe the following audio in ${language}. Return only the transcription text.`
        : 'Transcribe the following spoken audio into clear English text. Return ONLY the verbatim transcription text with no commentary.';

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: cleanMimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
    };

    // Current Gemini model names (as of 2026). gemini-3.6-flash is confirmed working.
    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-pro-preview',
    ];

    let lastError = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Model ${model} failed (${response.status}): ${errText}`;
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return {
            text: text.trim(),
            provider: this.name,
            latencyMs: 0,
          };
        }
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    throw new Error(`Gemini transcription failed: ${lastError}`);
  }
}