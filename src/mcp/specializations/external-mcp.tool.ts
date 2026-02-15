import { McpTool } from './mcp.tool';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ZodSchema } from 'zod'; // We need z for a dummy schema or conversion if absolutely needed, but we override getJsonSchema
import { cleanArgs, jsonSchemaToZod } from '../utils';

export class ExternalMcpTool extends McpTool<any> {
  name: string;
  description: string;
  private rawInputSchema: any;
  private client: Client;
  private originalName: string;

  constructor(
    serverName: string,
    toolName: string,
    description: string,
    inputSchema: any,
    client: Client,
    tags?: string[],
  ) {
    super();
    this.name = `${serverName}___${toolName}`;
    this.originalName = toolName;
    this.description = description;
    this.rawInputSchema = inputSchema;
    this.client = client;
    this.tags = tags;
  }

  getSchema(): ZodSchema<any> {
    // Fallback: convert JSON schema to Zod if something tries to use standard .getSchema()
    // Ideally we use .getJsonSchema() directly to avoid round-trip
    return jsonSchemaToZod(this.rawInputSchema);
  }

  override getJsonSchema(): any {
    return this.rawInputSchema;
  }

  async execute(params: any): Promise<any> {
    return this.client.callTool({
      name: this.originalName,
      arguments: cleanArgs(params),
    });
  }
}
