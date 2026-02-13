import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@config/config.service';
import { generateText } from 'ai';
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

      let steps = 0;
      const MAX_STEPS = 5;

      while (steps < MAX_STEPS) {
        const result = await generateText({
          model: openai('gpt-5.2-chat-latest'),
          messages: conversation,
          tools,
        });

        const { text, response } = result;
        if (text) return text;

        const toolCalls = response.messages.filter((m) => m.role === 'tool');

        if (!toolCalls.length) {
          return text || 'Sem resposta.';
        }

        // executa tools
        for (const call of toolCalls) {
          let resp = '';
          for (const r of call.content) {
            if (r.type !== 'tool-result') continue;

            if (r.output.type === 'text') {
              resp += r.output.value;
              continue;
            }

            if (r.output.type === 'json') {
              resp += (r.output.value as any)?.content?.[0]?.text;
            }
          }

          conversation.push({
            role: 'tool',
            content: resp,
          });
        }

        steps++;
      }

      return 'Não consegui concluir após várias tentativas.';
    } catch (err) {
      this.logger.error('LLM error', err);
      return 'Erro ao gerar resposta.';
    }
  }
}
