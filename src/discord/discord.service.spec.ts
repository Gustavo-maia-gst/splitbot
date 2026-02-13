import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { InteractionType, InteractionResponseType } from './types/interaction-response.types';
import { InteractionDto } from './dto/interaction.dto';
import { VerifyUserDto } from './dto/verify-user.dto';

describe('DiscordService', () => {
  let service: DiscordService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordService],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
  });

  describe('handleInteraction', () => {
    describe('PING interactions', () => {
      it('should return PONG for PING interaction', () => {
        const interaction: InteractionDto = {
          type: InteractionType.PING,
          id: 'test-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
        };

        const result = service.handleInteraction(interaction);

        expect(result).toEqual({
          type: InteractionResponseType.PONG,
        });
      });
    });

    describe('APPLICATION_COMMAND interactions', () => {
      it('should handle command without name', () => {
        const interaction: InteractionDto = {
          type: InteractionType.APPLICATION_COMMAND,
          id: 'cmd-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {},
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
        expect(result.data?.content).toContain('Hello from SplitC!');
      });

      it('should handle command with name', () => {
        const interaction: InteractionDto = {
          type: InteractionType.APPLICATION_COMMAND,
          id: 'cmd-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            name: 'help',
          },
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
        expect(result.data?.content).toContain('help');
      });

      it('should handle different command names', () => {
        const commands = ['split', 'balance', 'history', 'settings'];

        commands.forEach((commandName) => {
          const interaction: InteractionDto = {
            type: InteractionType.APPLICATION_COMMAND,
            id: 'cmd-id',
            application_id: 'app-id',
            token: 'token',
            version: 1,
            data: {
              name: commandName,
            },
          };

          const result = service.handleInteraction(interaction);

          expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
          expect(result.data?.content).toContain(commandName);
        });
      });
    });

    describe('MESSAGE_COMPONENT interactions', () => {
      it('should handle component without custom_id', () => {
        const interaction: InteractionDto = {
          type: InteractionType.MESSAGE_COMPONENT,
          id: 'component-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {},
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.UPDATE_MESSAGE);
        expect(result.data?.content).toBe('Component interaction handled!');
      });

      it('should handle component with custom_id', () => {
        const interaction: InteractionDto = {
          type: InteractionType.MESSAGE_COMPONENT,
          id: 'component-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            custom_id: 'confirm_button',
          },
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.UPDATE_MESSAGE);
        expect(result.data?.content).toBe('Component interaction handled!');
      });

      it('should handle different component types', () => {
        const customIds = ['button_primary', 'select_users', 'button_danger'];

        customIds.forEach((customId) => {
          const interaction: InteractionDto = {
            type: InteractionType.MESSAGE_COMPONENT,
            id: 'component-id',
            application_id: 'app-id',
            token: 'token',
            version: 1,
            data: {
              custom_id: customId,
            },
          };

          const result = service.handleInteraction(interaction);

          expect(result.type).toBe(InteractionResponseType.UPDATE_MESSAGE);
        });
      });
    });

    describe('MODAL_SUBMIT interactions', () => {
      it('should handle modal submission without custom_id', () => {
        const interaction: InteractionDto = {
          type: InteractionType.MODAL_SUBMIT,
          id: 'modal-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {},
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
        expect(result.data?.content).toBe('Modal submitted successfully!');
      });

      it('should handle modal submission with custom_id', () => {
        const interaction: InteractionDto = {
          type: InteractionType.MODAL_SUBMIT,
          id: 'modal-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            custom_id: 'feedback_modal',
          },
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
        expect(result.data?.content).toBe('Modal submitted successfully!');
      });
    });

    describe('unknown interaction types', () => {
      it('should handle unknown interaction type gracefully', () => {
        const interaction: InteractionDto = {
          type: 999 as InteractionType,
          id: 'unknown-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
        };

        const result = service.handleInteraction(interaction);

        expect(result.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
        expect(result.data?.content).toBe('Unknown interaction type');
      });
    });
  });

  describe('verifyUser', () => {
    describe('with userId only', () => {
      it('should verify user successfully', async () => {
        const dto: VerifyUserDto = {
          userId: '123456789',
        };

        const result = await service.verifyUser(dto);

        expect(result).toEqual({
          success: true,
          userId: '123456789',
          verified: true,
          message: 'User verification successful',
        });
      });
    });

    describe('with userId and guildId', () => {
      it('should verify user in guild', async () => {
        const dto: VerifyUserDto = {
          userId: '123456789',
          guildId: '987654321',
        };

        const result = await service.verifyUser(dto);

        expect(result).toEqual({
          success: true,
          userId: '123456789',
          verified: true,
          message: 'User verification successful',
        });
      });
    });

    describe('with userId, guildId and code', () => {
      it('should verify user with verification code', async () => {
        const dto: VerifyUserDto = {
          userId: '123456789',
          guildId: '987654321',
          code: 'ABC123',
        };

        const result = await service.verifyUser(dto);

        expect(result).toEqual({
          success: true,
          userId: '123456789',
          verified: true,
          message: 'User verification successful',
        });
      });
    });

    describe('with different userIds', () => {
      it('should handle various userId formats', async () => {
        const userIds = ['123', '999888777666', '111222333444555666'];

        for (const userId of userIds) {
          const dto: VerifyUserDto = { userId };
          const result = await service.verifyUser(dto);

          expect(result.userId).toBe(userId);
          expect(result.success).toBe(true);
          expect(result.verified).toBe(true);
        }
      });
    });
  });
});
