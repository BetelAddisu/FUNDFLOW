import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../../types';

export class GroqReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'groq';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq reasoning failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq returned no text');

    return { text, provider: this.name, latencyMs: 0 };
  }
}