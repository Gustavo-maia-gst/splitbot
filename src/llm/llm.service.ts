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
      const apiKey = this.configService.openai.apiKey;
      if (!apiKey) {
        return 'Desculpe, não estou configurado para responder perguntas no momento.';
      }

      const tools = await this.mcpService.getTools();

      const conversation: any[] = [
        {
          role: 'system',
          content: `Você é um bot do Discord inteligente e útil chamado SplitBot.
Você ajuda usuários respondendo perguntas com base no contexto das mensagens recentes do canal.
Seja conciso, direto e amigável.
Você tem acesso a ferramentas via MCP (Model Context Protocol).
Quando usar uma ferramenta:
1. Aguarde o resultado.
2. Interprete os dados.
3. Gere uma resposta em português, em tom descontraído.`,
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

        const { response, text } = result;

        // adiciona mensagens do assistant
        for (const msg of response.messages) {
          conversation.push(msg);
        }

        // coleta tool calls
        const toolCalls = response.messages.flatMap((m) =>
          m.role === 'assistant' && Array.isArray(m.content)
            ? m.content.filter((c) => c.type === 'tool-call')
            : [],
        );

        // se não tem tool call → resposta final
        if (toolCalls.length === 0) {
          return text ?? 'Não consegui gerar resposta.';
        }

        // executa cada tool
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

      return 'Não consegui concluir a resposta após várias tentativas.';
    } catch (error) {
      this.logger.error('Failed to generate LLM response', error);
      return 'Desculpe, tive um problema ao tentar processar sua solicitação.';
    }
  }
}
