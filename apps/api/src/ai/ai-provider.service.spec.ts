import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderService } from './ai-provider.service';

function buildService(env: Record<string, string> = {}) {
  const config = { get: jest.fn((key: string) => env[key]) } as unknown as ConfigService;
  return new AiProviderService(config);
}

describe('AiProviderService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports not configured without an API key', () => {
    const service = buildService();
    expect(service.isConfigured).toBe(false);
  });

  it('reports configured once an API key is present', () => {
    const service = buildService({ GEMINI_API_KEY: 'key-123' });
    expect(service.isConfigured).toBe(true);
  });

  it('refuses to call the provider without an API key', async () => {
    const service = buildService();
    await expect(service.complete('hola')).rejects.toThrow(ServiceUnavailableException);
  });

  it('extracts the generated text from a successful Gemini response', async () => {
    const service = buildService({ GEMINI_API_KEY: 'key-123' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'respuesta generada' }] } }] }),
    }) as unknown as typeof fetch;

    const result = await service.complete('hola');
    expect(result).toBe('respuesta generada');
  });

  it('throws when Gemini responds with a non-2xx status', async () => {
    const service = buildService({ GEMINI_API_KEY: 'key-123' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }) as unknown as typeof fetch;

    await expect(service.complete('hola')).rejects.toThrow(ServiceUnavailableException);
  });
});
