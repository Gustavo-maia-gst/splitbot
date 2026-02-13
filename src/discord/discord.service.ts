import { Injectable, Logger } from '@nestjs/common';
import { InteractionDto } from './dto/interaction.dto';
import { VerifyUserDto } from './dto/verify-user.dto';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponse,
} from './types/interaction-response.types';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  handleInteraction(interaction: InteractionDto): InteractionResponse {
    this.logger.log(`Received interaction type: ${interaction.type}`);

    switch (interaction.type) {
      case InteractionType.PING:
        return this.handlePing();

      case InteractionType.APPLICATION_COMMAND:
        return this.handleApplicationCommand(interaction);

      case InteractionType.MESSAGE_COMPONENT:
        return this.handleMessageComponent(interaction);

      case InteractionType.MODAL_SUBMIT:
        return this.handleModalSubmit(interaction);

      default:
        this.logger.warn(`Unknown interaction type: ${interaction.type}`);
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Unknown interaction type' },
        };
    }
  }

  private handlePing(): InteractionResponse {
    this.logger.log('Responding to PING with PONG');
    return { type: InteractionResponseType.PONG };
  }

  private handleApplicationCommand(interaction: InteractionDto): InteractionResponse {
    const commandName = interaction.data?.name;
    this.logger.log(`Handling application command: ${commandName}`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Hello from SplitC! Command received: ${commandName}`,
      },
    };
  }

  private handleMessageComponent(interaction: InteractionDto): InteractionResponse {
    const customId = interaction.data?.custom_id;
    this.logger.log(`Handling message component: ${customId}`);

    return {
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: 'Component interaction handled!',
      },
    };
  }

  private handleModalSubmit(interaction: InteractionDto): InteractionResponse {
    const customId = interaction.data?.custom_id;
    this.logger.log(`Handling modal submit: ${customId}`);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Modal submitted successfully!',
      },
    };
  }

  async verifyUser(dto: VerifyUserDto) {
    this.logger.log(`Verifying user: ${dto.userId}`);

    return {
      success: true,
      userId: dto.userId,
      verified: true,
      message: 'User verification successful',
    };
  }
}
