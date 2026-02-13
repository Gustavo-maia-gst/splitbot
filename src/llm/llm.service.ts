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

        const assistantMessage = response.messages.at(-1);

        if (!assistantMessage) {
          return text || 'Sem resposta.';
        }

        // adiciona SOMENTE a última mensagem do assistant
        conversation.push(assistantMessage);

        // verifica se tem tool call
        const toolCalls =
          assistantMessage.role === 'assistant' && Array.isArray(assistantMessage.content)
            ? assistantMessage.content.filter((c) => c.type === 'tool-call')
            : [];

        if (!toolCalls.length) {
          return text || 'Sem resposta.';
        }

        // executa tools
        for (const call of toolCalls) {
          const toolResult = await this.mcpService.executeTool(call.toolName, call.input);

          conversation.push({
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                output: {
                  type: 'text',
                  text: JSON.stringify(toolResult),
                },
              },
            ],
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
