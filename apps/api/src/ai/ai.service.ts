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
    const model = this.getModel(opts);
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async generateJson<T>(prompt: string, opts: GenerateJsonOptions<T>): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: opts.model ?? this.defaultModel,
      systemInstruction: opts.systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: opts.schema,
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as T;
  }
}
