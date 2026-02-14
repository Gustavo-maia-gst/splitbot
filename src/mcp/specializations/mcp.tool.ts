import { ZodSchema } from 'zod';

export const MCP_TOOL_TOKEN = 'MCP_TOOL_TOKEN';

export abstract class McpTool<T = any> {
  abstract name: string;
  abstract description: string;
  abstract getSchema(): ZodSchema<T>;
  abstract execute(params: T): Promise<any>;

  async skill(): Promise<string> {
    return '';
  }
}
