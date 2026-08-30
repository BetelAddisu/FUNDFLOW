import { ReasoningProvider, ReasoningResult, ReasoningProviderName } from '../../types';

export class OpenRouterReasoningProvider implements ReasoningProvider {
  name: ReasoningProviderName = 'openrouter';

  async complete(prompt: string): Promise<ReasoningResult> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter reasoning failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter returned no text');

    return { text, provider: this.name, latencyMs: 0 };
  }
}