import { Test, TestingModule } from '@nestjs/testing';
import { CurlTool } from './curl.tool';

describe('CurlTool', () => {
  let tool: CurlTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CurlTool],
    }).compile();

    tool = module.get<CurlTool>(CurlTool);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(tool).toBeDefined();
  });

  it('should execute GET request successfully', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: jest.fn().mockResolvedValue('{"success":true}'),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const input = { url: 'https://example.com' };
    const params = tool.getSchema().parse(input);
    const result = await tool.execute(params);

    expect(global.fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'GET',
      headers: undefined,
      body: undefined,
    });
    expect(result).toEqual({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: '{"success":true}',
    });
  });

  it('should execute POST request with body and headers', async () => {
    const mockResponse = {
      status: 201,
      statusText: 'Created',
      headers: new Headers(),
      text: jest.fn().mockResolvedValue('Created'),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const input = {
      url: 'https://example.com/api',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      body: '{"data":"test"}',
    };
    const params = tool.getSchema().parse(input);

    const result = await tool.execute(params);

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"data":"test"}',
    });
    expect(result.status).toBe(201);
  });

  it('should throw error on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const params = tool.getSchema().parse({ url: 'https://example.com' });
    await expect(tool.execute(params)).rejects.toThrow('Failed to execute request: Network error');
  });
});
