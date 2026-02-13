import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { generateText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { McpService } from '../mcp/mcp.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpService: McpService,
  ) {}

  async generateResponse(messages: any[]): Promise<string> {
    try {
      const tools = await this.mcpService.getTools();

      const conversation: any[] = [
        {
          role: 'system',
          content: `Você é um bot do Discord chamado SplitBot.
Você pode usar ferramentas MCP.
Quando usar uma ferramenta:
1. Aguarde o resultado.
2. Interprete os dados.
3. Gere resposta em português.`,
        },
        ...messages,
      ];

      const { text } = await generateText({
        model: openai('gpt-5.1-codex-max'),
        messages: conversation,
        stopWhen: stepCountIs(5),
        tools,
      });

      return text;
    } catch (err) {
      this.logger.error('LLM error', err);
      return 'Erro ao gerar resposta.';
    }
  }
}
