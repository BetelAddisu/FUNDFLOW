import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../../types';

export class PrimaryReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'primary';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.REASONING_PRIMARY_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('REASONING_PRIMARY_API_KEY is not set');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Primary reasoning failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Primary reasoning returned no text');

    return { text, provider: this.name, latencyMs: 0 };
  }
}