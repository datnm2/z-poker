import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  ResponseSchema,
} from "@google/generative-ai";

export interface GenerateOptions {
  model?: string;
  systemInstruction?: string;
}

export interface GenerateJsonOptions<T> extends GenerateOptions {
  schema: ResponseSchema;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private client!: GoogleGenerativeAI;
  private defaultModel = "gemini-3-flash-preview";
  private fallbackModel = "gemini-2.0-flash";

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const apiKey = this.config.getOrThrow<string>("GEMINI_API_KEY");
    this.client = new GoogleGenerativeAI(apiKey);
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private getModel(opts?: GenerateOptions): GenerativeModel {
    return this.client.getGenerativeModel({
      model: opts?.model ?? this.defaultModel,
      systemInstruction: opts?.systemInstruction,
    });
  }

  async generateText(prompt: string, opts?: GenerateOptions): Promise<string> {
    try {
      const model = this.getModel(opts);
      const result = await this.withRetry(() => model.generateContent(prompt));
      return result.response.text();
    } catch (err) {
      if (!this.is5xx(err) || opts?.model) throw err;
      this.logger.warn(`Primary model 5xx, falling back to ${this.fallbackModel}`);
      const model = this.getModel({ ...opts, model: this.fallbackModel });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  }

  async generateJson<T>(prompt: string, opts: GenerateJsonOptions<T>): Promise<T> {
    const buildModel = (modelName: string) =>
      this.client.getGenerativeModel({
        model: modelName,
        systemInstruction: opts.systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: opts.schema,
        },
      });
    try {
      const model = buildModel(opts.model ?? this.defaultModel);
      const result = await this.withRetry(() => model.generateContent(prompt));
      return JSON.parse(result.response.text()) as T;
    } catch (err) {
      if (!this.is5xx(err) || opts.model) throw err;
      this.logger.warn(`Primary model ${opts.model ?? this.defaultModel} 5xx, falling back to ${this.fallbackModel}`);
      const model = buildModel(this.fallbackModel);
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text()) as T;
    }
  }

  // Gemini preview models return 503 ("high demand") fairly often; the server
  // usually recovers within seconds. 429 and 5xx are also worth retrying.
  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (!this.isRetryable(err) || attempt === maxAttempts - 1) throw err;
        const base = 1000 * 2 ** attempt;
        const delay = base * (0.7 + Math.random() * 0.6);
        this.logger.warn(
          `AI call failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${Math.round(delay)}ms: ${(err as Error).message}`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  private isRetryable(err: unknown): boolean {
    const msg = (err as Error)?.message ?? "";
    return /\b(429|500|502|503|504)\b/.test(msg) || /high demand|overloaded|unavailable|ECONNRESET|ETIMEDOUT/i.test(msg);
  }

  private is5xx(err: unknown): boolean {
    const msg = (err as Error)?.message ?? "";
    return /\b(500|502|503|504)\b/.test(msg) || /high demand|overloaded|unavailable/i.test(msg);
  }
}
