import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';
import { VerifySignatureMiddleware } from './middleware/verify-signature.middleware';

@Module({
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VerifySignatureMiddleware)
      .forRoutes({ path: 'discord/interactions', method: RequestMethod.POST });
  }
}
