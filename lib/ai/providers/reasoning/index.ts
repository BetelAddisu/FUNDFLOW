import { ReasoningProvider, ReasoningResult } from '../../types';
import { PrimaryReasoningProvider } from './primary';
import { OpenRouterReasoningProvider } from './openrouter';
import { GroqReasoningProvider } from './groq';
import { PrimaryBackupReasoningProvider } from './primaryBackup';

let reasoningProviders: ReasoningProvider[] = [
  new PrimaryReasoningProvider(),
  new OpenRouterReasoningProvider(),
  new GroqReasoningProvider(),
  new PrimaryBackupReasoningProvider(),
];

export function setReasoningProviders(providers: ReasoningProvider[]) {
  reasoningProviders = providers;
}

function withTimeout<T>(promise: Promise<T>, ms: number, providerName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded for ${providerName}`)), ms)
    ),
  ]);
}

export async function completeWithFallback(prompt: string): Promise<ReasoningResult> {
  const start = Date.now();
  for (const provider of reasoningProviders) {
    try {
      const result = await withTimeout(provider.complete(prompt), 5000, provider.name);
      result.latencyMs = Date.now() - start;
      result.provider = provider.name;
      return result;
    } catch (err) {
      console.warn(`Reasoning provider ${provider.name} failed:`, err);
    }
  }
  return {
    text: '',
    provider: 'unresolved',
    latencyMs: Date.now() - start,
  };
}

export function getReasoningProvider() {
  return {
    complete: completeWithFallback,
  };
}