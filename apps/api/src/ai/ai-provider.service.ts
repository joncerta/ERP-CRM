import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around Google Gemini's free-tier API (Google AI Studio —
 * no credit card needed to get a key, unlike OpenAI). Kept behind this one
 * method so swapping providers later means implementing `complete()`
 * again, not touching every feature service that calls it.
 *
 * Without GEMINI_API_KEY configured, every call throws a clear 503 instead
 * of silently no-op'ing like EmailService does — there's no sensible
 * fallback "draft" or "answer" to return, so callers (and the UI) need to
 * know AI features simply aren't available yet.
 */
@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('IA no configurada — el administrador de la plataforma debe configurar GEMINI_API_KEY');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Gemini respondió ${response.status}: ${body}`);
      throw new ServiceUnavailableException('El proveedor de IA no pudo procesar la solicitud');
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new ServiceUnavailableException('El proveedor de IA devolvió una respuesta vacía');
    }
    return text;
  }
}
