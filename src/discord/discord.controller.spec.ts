import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';
import { InteractionType, InteractionResponseType } from './types/interaction-response.types';

describe('DiscordController', () => {
  let app: INestApplication;
  let discordService: DiscordService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DiscordController],
      providers: [
        {
          provide: DiscordService,
          useValue: {
            handleInteraction: jest.fn(),
            verifyUser: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    discordService = moduleFixture.get<DiscordService>(DiscordService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /discord/interactions', () => {
    describe('when receiving PING interaction', () => {
      it('should return PONG response', async () => {
        const pingPayload = {
          type: InteractionType.PING,
          id: 'test-id',
          application_id: 'test-app-id',
          token: 'test-token',
          version: 1,
        };

        const pongResponse = {
          type: InteractionResponseType.PONG,
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(pongResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(pingPayload)
          .expect(200);

        expect(response.body).toEqual(pongResponse);
        expect(discordService.handleInteraction).toHaveBeenCalledWith(pingPayload);
      });
    });

    describe('when receiving APPLICATION_COMMAND interaction', () => {
      it('should handle slash command and return message', async () => {
        const commandPayload = {
          type: InteractionType.APPLICATION_COMMAND,
          id: 'cmd-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            id: 'cmd-data-id',
            name: 'help',
          },
        };

        const commandResponse = {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Hello from SplitC! Command received: help',
          },
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(commandResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(commandPayload)
          .expect(200);

        expect(response.body).toEqual(commandResponse);
        expect(discordService.handleInteraction).toHaveBeenCalledWith(commandPayload);
      });

      it('should handle command with options', async () => {
        const commandWithOptions = {
          type: InteractionType.APPLICATION_COMMAND,
          id: 'cmd-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            id: 'cmd-data-id',
            name: 'split',
            options: [
              { name: 'amount', value: 100 },
              { name: 'users', value: 5 },
            ],
          },
        };

        const commandResponse = {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Split command processed',
          },
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(commandResponse);

        await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(commandWithOptions)
          .expect(200);

        expect(discordService.handleInteraction).toHaveBeenCalledWith(commandWithOptions);
      });
    });

    describe('when receiving MESSAGE_COMPONENT interaction', () => {
      it('should handle button click', async () => {
        const buttonPayload = {
          type: InteractionType.MESSAGE_COMPONENT,
          id: 'component-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            custom_id: 'confirm_button',
          },
        };

        const componentResponse = {
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: 'Component interaction handled!',
          },
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(componentResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(buttonPayload)
          .expect(200);

        expect(response.body).toEqual(componentResponse);
        expect(discordService.handleInteraction).toHaveBeenCalledWith(buttonPayload);
      });

      it('should handle select menu interaction', async () => {
        const selectPayload = {
          type: InteractionType.MESSAGE_COMPONENT,
          id: 'component-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            custom_id: 'user_select',
            values: ['user1', 'user2'],
          },
        };

        const selectResponse = {
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: 'Selection processed',
          },
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(selectResponse);

        await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(selectPayload)
          .expect(200);

        expect(discordService.handleInteraction).toHaveBeenCalledWith(selectPayload);
      });
    });

    describe('when receiving MODAL_SUBMIT interaction', () => {
      it('should handle modal submission', async () => {
        const modalPayload = {
          type: InteractionType.MODAL_SUBMIT,
          id: 'modal-id',
          application_id: 'app-id',
          token: 'token',
          version: 1,
          data: {
            custom_id: 'feedback_modal',
          },
        };

        const modalResponse = {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Modal submitted successfully!',
          },
        };

        jest.spyOn(discordService, 'handleInteraction').mockReturnValue(modalResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(modalPayload)
          .expect(200);

        expect(response.body).toEqual(modalResponse);
        expect(discordService.handleInteraction).toHaveBeenCalledWith(modalPayload);
      });
    });

    describe('validation', () => {
      it('should reject invalid interaction type', async () => {
        const invalidPayload = {
          type: 'invalid',
        };

        await request(app.getHttpServer())
          .post('/discord/interactions')
          .send(invalidPayload)
          .expect(400);
      });
    });
  });

  describe('POST /discord/verify-user', () => {
    describe('when verifying user with userId only', () => {
      it('should verify user successfully', async () => {
        const verifyPayload = {
          userId: '123456789',
        };

        const verifyResponse = {
          success: true,
          userId: '123456789',
          verified: true,
          message: 'User verification successful',
        };

        jest.spyOn(discordService, 'verifyUser').mockResolvedValue(verifyResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/verify-user')
          .send(verifyPayload)
          .expect(200);

        expect(response.body).toEqual(verifyResponse);
        expect(discordService.verifyUser).toHaveBeenCalledWith(verifyPayload);
      });
    });

    describe('when verifying user with guildId', () => {
      it('should verify user in specific guild', async () => {
        const verifyPayload = {
          userId: '123456789',
          guildId: '987654321',
        };

        const verifyResponse = {
          success: true,
          userId: '123456789',
          guildId: '987654321',
          verified: true,
          message: 'User verification successful',
        };

        jest.spyOn(discordService, 'verifyUser').mockResolvedValue(verifyResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/verify-user')
          .send(verifyPayload)
          .expect(200);

        expect(response.body).toEqual(verifyResponse);
        expect(discordService.verifyUser).toHaveBeenCalledWith(verifyPayload);
      });
    });

    describe('when verifying user with verification code', () => {
      it('should verify user with code', async () => {
        const verifyPayload = {
          userId: '123456789',
          guildId: '987654321',
          code: 'ABC123',
        };

        const verifyResponse = {
          success: true,
          userId: '123456789',
          verified: true,
          message: 'User verification successful',
        };

        jest.spyOn(discordService, 'verifyUser').mockResolvedValue(verifyResponse);

        const response = await request(app.getHttpServer())
          .post('/discord/verify-user')
          .send(verifyPayload)
          .expect(200);

        expect(response.body).toEqual(verifyResponse);
        expect(discordService.verifyUser).toHaveBeenCalledWith(verifyPayload);
      });
    });

    describe('validation', () => {
      it('should reject request without userId', async () => {
        const invalidPayload = {
          guildId: '987654321',
        };

        await request(app.getHttpServer())
          .post('/discord/verify-user')
          .send(invalidPayload)
          .expect(400);
      });

      it('should reject request with invalid userId type', async () => {
        const invalidPayload = {
          userId: 123456,
        };

        await request(app.getHttpServer())
          .post('/discord/verify-user')
          .send(invalidPayload)
          .expect(400);
      });
    });
  });
});
