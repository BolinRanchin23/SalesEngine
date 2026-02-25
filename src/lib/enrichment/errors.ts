import { Provider } from './types';

export class ProviderError extends Error {
  provider: Provider;
  statusCode?: number;
  responseBody?: unknown;

  constructor(provider: Provider, message: string, statusCode?: number, responseBody?: unknown) {
    super(`[${provider}] ${message}`);
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class RateLimitError extends ProviderError {
  retryAfterMs: number;

  constructor(provider: Provider, retryAfterMs: number) {
    super(provider, `Rate limited. Retry after ${retryAfterMs}ms`, 429);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class BudgetExhaustedError extends Error {
  provider: Provider;
  period: 'daily' | 'monthly';

  constructor(provider: Provider, period: 'daily' | 'monthly') {
    super(`[${provider}] ${period} credit budget exhausted`);
    this.name = 'BudgetExhaustedError';
    this.provider = provider;
    this.period = period;
  }
}
