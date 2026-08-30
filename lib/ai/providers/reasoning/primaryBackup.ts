import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../../types';

export class PrimaryBackupReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'primaryBackup';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.REASONING_PRIMARY_BACKUP_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('REASONING_PRIMARY_BACKUP_API_KEY is not set');

    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok && response.status === 429) {
      // Fallback to gemini-1.5-flash on rate limit
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
    }

    if (!response.ok) {
      throw new Error(`Primary backup reasoning failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Primary backup reasoning returned no text');

    return { text, provider: this.name, latencyMs: 0 };
  }
}