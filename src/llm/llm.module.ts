import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigModule } from '@config/config.module';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [ConfigModule, McpModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
