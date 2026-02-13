import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool, tool } from 'ai';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { jsonSchemaToZod } from './utils';

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabledTools?: string[];
  disabled?: boolean;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

@Injectable()
export class McpService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(McpService.name);
  private clients: Map<string, Client> = new Map();

  async onModuleInit() {
    await this.connectToServers();
  }

  async onApplicationShutdown() {
    await this.disconnectFromServers();
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    const [serverName, mcpToolName] = toolName.split('_', 2);

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`);
    }

    this.logger.debug(
      `Executing MCP tool ${serverName}.${mcpToolName} with args: ${JSON.stringify(args)}`,
    );

    const result = await client.callTool({
      name: mcpToolName,
      arguments: args,
    });

    this.logger.debug(`MCP tool ${serverName}.${mcpToolName} result: ${JSON.stringify(result)}`);

    return result;
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

  async getTools(): Promise<Record<string, Tool>> {
    const allTools: Record<string, Tool> = {};

    for (const [serverName, client] of this.clients) {
      try {
        const { tools } = await client.listTools();
        const configPath = join(process.cwd(), 'mcp-config.json');
        const configContent = await readFile(configPath, 'utf-8');
        const config: McpConfig = JSON.parse(configContent);
        const serverConfig = config.mcpServers[serverName];

        for (const mcpTool of tools) {
          if (serverConfig?.disabledTools?.includes(mcpTool.name)) {
            continue;
          }

          const toolName = `${serverName}.${mcpTool.name}`;

          allTools[toolName] = tool<any, any>({
            description: mcpTool.description,
            inputSchema: jsonSchemaToZod(mcpTool.inputSchema),
            execute: async (args) => {
              this.logger.debug(`Executing tool ${toolName} with args: ${JSON.stringify(args)}`);
              try {
                const result = await client.callTool({
                  name: mcpTool.name,
                  arguments: args,
                });
                this.logger.debug(`Tool ${toolName} execution result: ${JSON.stringify(result)}`);
                return result;
              } catch (error) {
                this.logger.error(`Error executing tool ${toolName}`, error);
                throw error;
              }
            },
          });
        }
      } catch (error) {
        this.logger.error(`Failed to list tools for server: ${serverName}`, error);
      }
    }

    return allTools;
  }
}
