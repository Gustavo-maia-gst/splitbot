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
      const { response } = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'system',
            content: `Você é um bot do Discord inteligente e útil chamado SplitBot.
            Você ajuda usuários respondendo perguntas com base no contexto das mensagens recentes do canal.
            Seja conciso, direto e amigável.
            Se a resposta não estiver no contexto, use seu conhecimento geral para ajudar, mas mencione que não encontrou a informação no histórico recente se for algo específico do contexto local.
            Você tem acesso a ferramentas via MCP (Model Context Protocol). Use-as quando necessário para responder perguntas sobre o GitHub, Linear, etc.`,
          },
          ...messages,
        ],
        tools,
        // @ts-expect-error maxSteps is not present in the type definition
        maxSteps: 5, // Required for multi-step tool execution
        onStepFinish: (step: any) => {
          this.logger.debug(`Step finished: ${JSON.stringify(step, null, 2)}`);
        },
      });

      const text = response.messages.join('\n');

      this.logger.debug(`LLM Response Text: ${text}`);
      return text;
    } catch (error) {
      this.logger.error('Failed to generate LLM response', error);
      return 'Desculpe, tive um problema ao tentar processar sua solicitação.';
    }
  }
}
