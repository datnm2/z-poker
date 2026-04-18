import { Body, Controller, Post } from "@nestjs/common";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AiService } from "./ai.service";

class GenerateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  prompt!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemInstruction?: string;
}

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("generate")
  async generate(@Body() body: GenerateDto) {
    const text = await this.ai.generateText(body.prompt, {
      model: body.model,
      systemInstruction: body.systemInstruction,
    });
    return { text };
  }
}
