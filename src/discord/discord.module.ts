import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';
import { DiscordBotService } from './discord-bot.service';
import { VerifySignatureMiddleware } from './middleware/verify-signature.middleware';
import { ConfigModule } from '@config/config.module';

import { LlmModule } from '../llm/llm.module';

import { DiscordMessageHandler } from './discord-message.handler';

@Module({
  imports: [ConfigModule, LlmModule],
  controllers: [DiscordController],
  providers: [DiscordService, DiscordBotService, DiscordMessageHandler],
  exports: [DiscordService, DiscordBotService],
})
export class DiscordModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VerifySignatureMiddleware)
      .forRoutes({ path: 'discord/interactions', method: RequestMethod.POST });
  }
}
