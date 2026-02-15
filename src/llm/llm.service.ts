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

  async generateResponse(
    messages: any[],
    promptId: string = 'planner',
    tags: string[] = [],
  ): Promise<string> {
    try {
      const toolDefinitions = await this.mcpService.getToolDefinitions(tags);
      const toolsJson = JSON.stringify(toolDefinitions, null, 2);

      const systemMessage = `
You have access to the following tools:
${toolsJson}

You MUST respond with a valid JSON object. No markdown, no plain text.
The JSON object MUST follow one of these two schemas:

1. Tool Call:
{ "type": "tool_call", "tool": "tool_name", "args": { ... } }

2. Final Response:
{ "type": "message", "content": "your response text" }

Do NOT return anything else.
`;

      const conversation: any[] = [
        {
          role: 'system',
          content: await this.fileService.loadPrompt(promptId),
        },
        {
          role: 'system',
          content: systemMessage,
        },
        ...messages,
      ];

      const { text } = await generateText({
        model: openai('gpt-5.1-codex-max'),
        messages: conversation,
        stopWhen: stepCountIs(15),
      });

      return text;
    } catch (err) {
      this.logger.error('LLM error', err);
      return 'Erro ao gerar resposta.';
    }
  }
}
