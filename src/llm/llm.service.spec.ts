import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { McpService } from '../mcp/mcp.service';
import { FileService } from '../common/file.service';
import { generateText } from 'ai';

// Mock 'ai' module
jest.mock('ai', () => ({
  generateText: jest.fn(),
  stepCountIs: jest.fn(),
}));

// Mock '@ai-sdk/openai' module
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

describe('LlmService', () => {
  let service: LlmService;
  let mcpService: McpService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: McpService,
          useValue: {
            getToolDefinitions: jest.fn().mockResolvedValue([
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: { type: 'object' },
              },
            ]),
          },
        },
        {
          provide: FileService,
          useValue: {
            loadPrompt: jest.fn().mockResolvedValue('System prompt content'),
          },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    mcpService = module.get<McpService>(McpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    it('should call getToolDefinitions with provided tags', async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: '{"type": "message", "content": "Hello"}',
      });

      const tags = ['planning'];
      await service.generateResponse([], 'planner', tags);

      expect(mcpService.getToolDefinitions).toHaveBeenCalledWith(tags);
    });

    it('should inject tool definitions and instructions into system message', async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: '{"type": "message", "content": "Hello"}',
      });

      await service.generateResponse([]);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('You have access to the following tools'),
            }),
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('test_tool'),
            }),
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('You MUST respond with a valid JSON object'),
            }),
          ]),
        }),
      );

      // Ensure specific instructions are present
      const calls = (generateText as jest.Mock).mock.calls;
      const args = calls[0][0];
      const systemMsg = args.messages.find(
        (m: any) =>
          m.role === 'system' && m.content.includes('You have access to the following tools'),
      );

      expect(systemMsg.content).toContain('"type": "tool_call"');
      expect(systemMsg.content).toContain('"type": "message"');
    });

    it('should NOT pass tools property to generateText', async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: '{"type": "message", "content": "Hello"}',
      });

      await service.generateResponse([]);

      const calls = (generateText as jest.Mock).mock.calls;
      const args = calls[0][0];

      expect(args.tools).toBeUndefined();
    });

    it('should return the text response directly', async () => {
      const mockResponse = '{"type": "message", "content": "Hello"}';
      (generateText as jest.Mock).mockResolvedValue({ text: mockResponse });

      const result = await service.generateResponse([]);

      expect(result).toBe(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.generateResponse([]);

      expect(result).toBe('Erro ao gerar resposta.');
    });
  });
});
