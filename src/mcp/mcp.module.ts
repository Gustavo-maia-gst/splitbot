import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { GoogleService } from './specializations/gcp/google.service';
import { MCP_TOOL_TOKEN, McpTool } from './specializations/mcp.tool';
import { TOOLS } from './specializations';
import { ConfigModule } from '@config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [
    McpService,
    GoogleService,
    ...TOOLS,
    {
      provide: MCP_TOOL_TOKEN,
      useFactory: (...tools: McpTool[]) => tools,
      inject: TOOLS,
    },
  ],
  exports: [McpService],
})
export class McpModule {}
