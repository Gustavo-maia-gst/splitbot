import { ZodSchema } from 'zod';

import { zodToJsonSchema } from 'zod-to-json-schema';

export const MCP_TOOL_TOKEN = 'MCP_TOOL_TOKEN';

export abstract class McpTool<T = any> {
  abstract name: string;
  abstract description: string;
  abstract getSchema(): ZodSchema<T>;
  abstract execute(params: T): Promise<any>;

  tags?: string[];

  async skill(): Promise<string> {
    return '';
  }

  getJsonSchema(): any {
    return zodToJsonSchema(this.getSchema() as any);
  }
}
