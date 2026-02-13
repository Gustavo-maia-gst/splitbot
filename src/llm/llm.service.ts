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
        this.logger.warn('OPENAI_API_KEY not configured.');
        return 'Desculpe, não estou configurado para responder perguntas no momento.';
      }

      const tools = await this.mcpService.getTools();

      const conversation = [
        {
          role: 'system',
          content: `Você é um bot do Discord inteligente e útil chamado SplitBot.
Você ajuda usuários respondendo perguntas com base no contexto das mensagens recentes do canal.
Seja conciso, direto e amigável.
Você tem acesso a ferramentas via MCP (Model Context Protocol).
Quando usar uma ferramenta:
1. Aguarde o resultado.
2. Interprete os dados.
3. Gere uma resposta em linguagem natural, em português, em tom descontraído.`,
        },
        ...messages,
      ];

      let finalText = '';
      let steps = 0;
      const MAX_STEPS = 5;

      while (steps < MAX_STEPS) {
        const result = await generateText({
          model: openai('gpt-5.2-chat-latest'),
          messages: conversation,
          tools,
        });

        const { text, response } = result;

        // adiciona mensagens do assistant
        for (const msg of response.messages) {
          conversation.push(msg);
        }

        // se não teve tool call, acabou
        const toolCalls = response.messages.filter(
          (m) =>
            m.role === 'assistant' &&
            Array.isArray(m.content) &&
            m.content.some((c) => c.type === 'tool-call'),
        );

        if (!toolCalls.length) {
          finalText += text ?? '';
          break;
        }

        // executa tools chamadas
        for (const msg of toolCalls) {
          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'tool-call') {
                const toolResult = await this.mcpService.executeTool(part.toolName, part.input);

                conversation.push({
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolCallId: part.toolCallId,
                      toolName: part.toolName,
                      result: toolResult,
                    },
                  ],
                });
              }
            }
          }
        }

        steps++;
      }

      return finalText || 'Não consegui gerar uma resposta.';
    } catch (error) {
      this.logger.error('Failed to generate LLM response', error);
      return 'Desculpe, tive um problema ao tentar processar sua solicitação.';
    }
  }
}
