import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ConfigModule } from '@config/config.module';
import { McpModule } from '../mcp/mcp.module';

import { CommonModule } from '../common/common.module';

@Module({
  imports: [ConfigModule, McpModule, CommonModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
