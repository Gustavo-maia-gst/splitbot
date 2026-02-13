import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { InteractionDto } from './dto/interaction.dto';
import { VerifyUserDto } from './dto/verify-user.dto';

@Controller('discord')
export class DiscordController {
  private readonly logger = new Logger(DiscordController.name);

  constructor(private readonly discordService: DiscordService) {}

  @Post('interactions')
  @HttpCode(HttpStatus.OK)
  handleInteraction(@Body() interaction: InteractionDto) {
    this.logger.log('Received Discord interaction');
    return this.discordService.handleInteraction(interaction);
  }

  @Post('verify-user')
  @HttpCode(HttpStatus.OK)
  async verifyUser(@Body() dto: VerifyUserDto) {
    this.logger.log(`User verification request for: ${dto.userId}`);
    return this.discordService.verifyUser(dto);
  }
}
