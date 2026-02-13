import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { ConfigService } from '../config/config.service';
import { generateText } from 'ai';

// Mock 'ai' module
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock '@ai-sdk/openai' module
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

describe('LlmService', () => {
  let service: LlmService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: {
            openai: {
              apiKey: 'test-api-key',
            },
          },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    it('should return generated text when API key is present', async () => {
      const mockText = 'Hello, how can I help?';
      (generateText as jest.Mock).mockResolvedValue({ text: mockText });

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await service.generateResponse(messages);

      expect(result).toBe(mockText);
      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            ...messages,
          ]),
        }),
      );
    });

    it('should return error message when API key is missing', async () => {
      // Re-compile module with missing API key
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LlmService,
          {
            provide: ConfigService,
            useValue: {
              openai: {
                apiKey: undefined,
              },
            },
          },
        ],
      }).compile();
      service = module.get<LlmService>(LlmService);

      const result = await service.generateResponse([]);
      expect(result).toContain('não estou configurado');
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should return error message when generation fails', async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error('API Error'));

      const result = await service.generateResponse([]);
      expect(result).toContain('tive um problema');
    });
  });
});
