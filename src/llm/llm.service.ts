import { Injectable, Logger } from '@nestjs/common';
import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { McpService } from '../mcp/mcp.service';
import { FileService } from '../common/file.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly mcpService: McpService,
    private readonly fileService: FileService,
  ) {}

  async generateResponse(messages: any[]): Promise<string> {
    try {
      const tools = await this.mcpService.getTools();

      const conversation: any[] = [
        {
          role: 'system',
          content: await this.fileService.loadPrompt('system'),
        },
        ...messages,
      ];

      const { text } = await generateText({
        model: openai('gpt-5.1-codex-max'),
        messages: conversation,
        stopWhen: stepCountIs(15),
        tools,
      });

      return text;
    } catch (err) {
      this.logger.error('LLM error', err);
      return 'Erro ao gerar resposta.';
    }
  }
}
