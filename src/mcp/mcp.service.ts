import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Tool, tool } from 'ai';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { cleanArgs, jsonSchemaToZod } from './utils';
import { MCP_TOOL_TOKEN, McpTool } from './specializations/mcp.tool';
import z from 'zod';

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

  constructor(@Inject(MCP_TOOL_TOKEN) private readonly internalTools: McpTool[]) {}

  async onModuleInit() {
    await this.connectToServers();
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

  async getTools(): Promise<Record<string, Tool>> {
    const allTools: Record<string, Tool> = {};

    for (const internalTool of this.internalTools) {
      await this.registerInternalTool(internalTool, allTools);
    }

    for (const [serverName, client] of this.clients) {
      await this.registerServerTools(serverName, client, allTools);
    }

    return allTools;
  }

  private async registerInternalTool(extTool: McpTool, allTools: Record<string, Tool>) {
    try {
      allTools[extTool.name] = tool({
        description: extTool.description,
        inputSchema: extTool.getSchema(),
        execute: async (args) => {
          this.logger.debug(
            `Executing internal tool ${extTool.name} with args: ${JSON.stringify(args)}`,
          );
          try {
            const result = await extTool.execute(cleanArgs(args));
            return result;
          } catch (error) {
            this.logger.error(`Error executing internal tool ${extTool.name}`, error);
            throw error;
          }
        },
      });

      const skill = await extTool.skill();
      if (skill) {
        allTools[`skill_${extTool.name}`] = tool({
          description: `Get meaningfull description and a how to use tutorial containing examples of the tool ${extTool.name}`,
          inputSchema: z.object({}),
          execute: async () => {
            this.logger.debug(`Getting internal skill ${extTool.name}`);
            return skill;
          },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to register internal tool ${extTool.name}`, err);
    }
  }

  private async registerServerTools(
    serverName: string,
    client: Client,
    allTools: Record<string, Tool>,
  ) {
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

        const toolName = `${serverName}___${mcpTool.name}`;

        if (mcpTool.name === 'list_issues') {
          console.log(JSON.stringify(mcpTool.inputSchema));
        }

        allTools[toolName] = tool<any, any>({
          description: mcpTool.description,
          inputSchema: jsonSchemaToZod(mcpTool.inputSchema),
          execute: async (args) => {
            this.logger.debug(`Executing tool ${toolName} with args: ${JSON.stringify(args)}`);
            try {
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: cleanArgs(args),
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
}
