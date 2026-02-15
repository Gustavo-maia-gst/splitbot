import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MCP_TOOL_TOKEN, McpTool } from './specializations/mcp.tool';
import { ExternalMcpTool } from './specializations/external-mcp.tool';

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabledTools?: string[];
  disabled?: boolean;
  tags?: string[];
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

@Injectable()
export class McpService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(McpService.name);
  private clients: Map<string, Client> = new Map();
  private allTools: Record<string, McpTool> = {};

  constructor(@Inject(MCP_TOOL_TOKEN) private readonly internalTools: McpTool[]) {}

  async onModuleInit() {
    await this.connectToServers();
    await this.registerTools();
  }

  async onApplicationShutdown() {
    await this.disconnectFromServers();
  }

  private async connectToServers() {
    try {
      const configPath = join(process.cwd(), 'mcp-config.json');
      const configContent = await readFile(configPath, 'utf-8');
      const config: McpConfig = JSON.parse(configContent);

      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (serverConfig.disabled) {
          this.logger.log(`Skipping disabled MCP server: ${serverName}`);
          continue;
        }
        await this.connectToServer(serverName, serverConfig);
      }
    } catch (error) {
      this.logger.error('Failed to load or process mcp-config.json', error);
    }
  }

  private async connectToServer(name: string, config: McpServerConfig) {
    try {
      this.logger.log(`Connecting to MCP server: ${name}`);

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      const client = new Client(
        {
          name: 'SplitBot',
          version: '1.0.0',
        },
        {
          capabilities: {},
        },
      );

      await client.connect(transport);
      this.clients.set(name, client);
      this.logger.log(`✅ Connected to MCP server: ${name}`);
    } catch (error) {
      this.logger.error(`❌ Failed to connect to MCP server: ${name}`, error);
    }
  }

  private async disconnectFromServers() {
    for (const [name, client] of this.clients) {
      try {
        await client.close();
        this.logger.log(`Disconnected from MCP server: ${name}`);
      } catch (error) {
        this.logger.error(`Error disconnecting from MCP server: ${name}`, error);
      }
    }
    this.clients.clear();
  }

  private async registerTools(): Promise<void> {
    const allTools: Record<string, McpTool> = {};

    // Register internal tools
    for (const internalTool of this.internalTools) {
      allTools[internalTool.name] = internalTool;
    }

    // Register external tools via config
    try {
      const configPath = join(process.cwd(), 'mcp-config.json');
      const configContent = await readFile(configPath, 'utf-8');
      const config: McpConfig = JSON.parse(configContent);

      for (const [serverName, client] of this.clients) {
        const serverConfig = config.mcpServers[serverName];
        try {
          const { tools } = await client.listTools();
          for (const tool of tools) {
            if (serverConfig?.disabledTools?.includes(tool.name)) {
              continue;
            }
            const externalTool = new ExternalMcpTool(
              serverName,
              tool.name,
              tool.description || '',
              tool.inputSchema,
              client,
              serverConfig?.tags,
            );
            allTools[externalTool.name] = externalTool;
          }
        } catch (err) {
          this.logger.error(`Failed to list tools for server ${serverName}`, err);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to load mcp-config.json for tool registration`, err);
    }

    this.allTools = allTools;
  }

  public async getToolDefinitions(tags?: string[]): Promise<any[]> {
    const definitions: any[] = [];

    for (const tool of Object.values(this.allTools)) {
      if (tags && tags.length > 0) {
        const toolTags = tool.tags || [];
        const hasMatchingTag = tags.some((tag) => toolTags.includes(tag));
        if (!hasMatchingTag) {
          continue;
        }
      }

      definitions.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.getJsonSchema(),
      });
    }

    return definitions;
  }
}
