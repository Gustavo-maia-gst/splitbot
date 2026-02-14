import { Test, TestingModule } from '@nestjs/testing';
import { DiscordMessageHandler } from './discord-message.handler';
import { LlmService } from '../llm/llm.service';
import { Message } from 'discord.js';

describe('DiscordMessageHandler', () => {
  let handler: DiscordMessageHandler;
  let llmService: LlmService;

  const mockLlmService = {
    generateResponse: jest.fn().mockResolvedValue('LLM Response'),
  };

  const mockClientUser = {
    id: 'bot-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordMessageHandler,
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    handler = module.get<DiscordMessageHandler>(DiscordMessageHandler);
    llmService = module.get<LlmService>(LlmService);
    jest.clearAllMocks();
  });

  const createMockMessage = (_overrides: any = {}): Partial<Message> => {
    return {
      author: {
        bot: false,
        tag: 'User#1234',
        id: 'user-id',
        username: 'User',
      } as any,
      mentions: {
        has: jest.fn().mockReturnValue(false),
      } as any,
      channel: {
        isDMBased: jest.fn().mockReturnValue(false),
        name: 'general',
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map()),
        } as any,
        sendTyping: jest.fn().mockResolvedValue(undefined),
      } as any,
      content: 'Hello',
      reply: jest.fn().mockResolvedValue({} as any),
      createdAt: new Date(),
    } as unknown as Message;
  };

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should ignore messages from bots', async () => {
    const message = createMockMessage();
    (message.author as any).bot = true;

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).not.toHaveBeenCalled();
  });

  it('should process message if bot is mentioned', async () => {
    const message = createMockMessage();
    (message?.mentions?.has as jest.Mock).mockReturnValue(true);

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).toHaveBeenCalled();
  });

  it('should process message if channel is DM', async () => {
    const message = createMockMessage();
    (message.channel as any).isDMBased.mockReturnValue(true);

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).toHaveBeenCalled();
  });

  it('should process message if content includes splitc', async () => {
    const message = createMockMessage({ content: 'hey splitc' });
    (message as any).content = 'hey splitc';

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).toHaveBeenCalled();
  });

  it('should process message if it is a reply to the bot', async () => {
    const message = createMockMessage();
    (message as any).reference = { messageId: 'ref-msg-id' };
    (message as any).fetchReference = jest.fn().mockResolvedValue({
      author: { id: mockClientUser.id },
    });

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).toHaveBeenCalled();
  });

  it('should process message if a role of the bot is mentioned', async () => {
    const message = createMockMessage();
    const roleId = 'role-123';

    (message!.mentions!.roles as any) = {
      some: jest.fn().mockImplementation((callback) => callback({ id: roleId })),
    };

    (message as any).guild = {
      members: {
        me: {
          roles: {
            cache: {
              has: jest.fn().mockReturnValue(true),
            },
          },
        },
      },
    };

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).toHaveBeenCalled();
  });

  it('should ignore message if neither mentioned, nor DM, nor keyword, nor reply, nor role mention', async () => {
    const message = createMockMessage();
    // Ensure creating mock message has empty roles and no reference
    (message.mentions as any).roles = { some: jest.fn().mockReturnValue(false) };
    (message as any).reference = null;
    (message as any).guild = {
      members: { me: { roles: { cache: { has: jest.fn().mockReturnValue(false) } } } },
    };

    await handler.handleMessage(message as Message, mockClientUser);

    expect(llmService.generateResponse).not.toHaveBeenCalled();
  });
});
