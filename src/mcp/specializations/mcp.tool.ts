import { ZodSchema } from 'zod';

export const MCP_TOOL_TOKEN = 'MCP_TOOL_TOKEN';

export interface McpTool<T = any> {
  name: string;
  description: string;
  getSchema(): ZodSchema<T>;
  execute(params: T): Promise<any>;
}
