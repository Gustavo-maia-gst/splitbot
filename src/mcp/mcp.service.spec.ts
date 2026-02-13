import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from './mcp.service';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs/promises';
import { join } from 'path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');

describe('McpService', () => {
  let service: McpService;
  let mockClient: jest.Mocked<Client>;

  const mockConfig = {
    mcpServers: {
      testServer: {
        command: 'echo',
        args: ['hello'],
        disabled: false,
        env: { TEST_ENV: 'value' },
      },
      disabledServer: {
        command: 'echo',
        disabled: true,
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock Client implementation
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({
        tools: [
          {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: {
              type: 'object',
              properties: {
                arg1: { type: 'string', description: 'Argument 1' },
              },
            },
          },
        ],
      }),
      callTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Tool result' }],
      }),
    } as any;

    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    const module: TestingModule = await Test.createTestingModule({
      providers: [McpService],
    }).compile();

    service = module.get<McpService>(McpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connectToServers', () => {
    it('should connect to enabled servers and skip disabled ones', async () => {
      await service.onModuleInit();

      expect(fs.readFile).toHaveBeenCalledWith(join(process.cwd(), 'mcp-config.json'), 'utf-8');

      // Should create transport with correct config
      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'echo',
        args: ['hello'],
        env: { TEST_ENV: 'value' },
      });

      // Should instantiate client
      expect(Client).toHaveBeenCalledWith(
        { name: 'SplitBot', version: '1.0.0' },
        { capabilities: {} },
      );

      // Should connect client
      expect(mockClient.connect).toHaveBeenCalled();

      // Should ONLY connect to testServer, not disabledServer
      expect(Client).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTools', () => {
    it('should return tools from connected servers converted to AI SDK format', async () => {
      await service.onModuleInit();
      const tools = await service.getTools();

      expect(mockClient.listTools).toHaveBeenCalled();
      expect(tools).toHaveProperty('testServer_test_tool');

      const tool = tools['testServer_test_tool'];
      expect(tool.description).toBe('A test tool');

      // Verify properties exist (cast to any to avoid TS issues)
      expect((tool as any).parameters || (tool as any).inputSchema).toBeDefined();
    });

    it('should execute the tool calling the MCP client', async () => {
      await service.onModuleInit();
      const tools = await service.getTools();
      const tool = tools['testServer_test_tool'] as any;

      const args = { arg1: 'value' };
      const result = await tool.execute(args, { toolCallId: '123', messages: [] });

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'test_tool',
        arguments: args,
      });
      expect(result).toEqual({ content: [{ type: 'text', text: 'Tool result' }] });
    });
  });

  describe('onApplicationShutdown', () => {
    it('should disconnect from all servers', async () => {
      await service.onModuleInit();
      await service.onApplicationShutdown();

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});
