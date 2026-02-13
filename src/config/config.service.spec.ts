import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let service: ConfigService;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', async () => {
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service).toBeDefined();
    });
  });

  describe('port', () => {
    it('should return PORT from environment', async () => {
      process.env.PORT = '4000';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.port).toBe(4000);
    });

    it('should return default port 3000 when PORT is not set', async () => {
      delete process.env.PORT;
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.port).toBe(3000);
    });

    it('should parse PORT as integer', async () => {
      process.env.PORT = '8080';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.port).toBe(8080);
      expect(typeof service.port).toBe('number');
    });
  });

  describe('nodeEnv', () => {
    it('should return NODE_ENV from environment', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.nodeEnv).toBe('production');
    });

    it('should return "development" when NODE_ENV is not set', async () => {
      delete process.env.NODE_ENV;
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.nodeEnv).toBe('development');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.isDevelopment).toBe(true);
    });

    it('should return false when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.isDevelopment).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.isProduction).toBe(true);
    });

    it('should return false when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DISCORD_PUBLIC_KEY = 'test-key';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.isProduction).toBe(false);
    });
  });

  describe('discord', () => {
    describe('publicKey', () => {
      it('should return DISCORD_PUBLIC_KEY from environment', async () => {
        process.env.DISCORD_PUBLIC_KEY = 'my-public-key-123';

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(service.discord.publicKey).toBe('my-public-key-123');
      });

      it('should throw error when DISCORD_PUBLIC_KEY is missing', async () => {
        delete process.env.DISCORD_PUBLIC_KEY;

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(() => service.discord.publicKey).toThrow(
          'Missing required environment variable: DISCORD_PUBLIC_KEY',
        );
      });
    });

    describe('clientId', () => {
      it('should return DISCORD_CLIENT_ID from environment', async () => {
        process.env.DISCORD_PUBLIC_KEY = 'test-key';
        process.env.DISCORD_CLIENT_ID = '123456789';

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(service.discord.clientId).toBe('123456789');
      });

      it('should return undefined when DISCORD_CLIENT_ID is not set', async () => {
        process.env.DISCORD_PUBLIC_KEY = 'test-key';
        delete process.env.DISCORD_CLIENT_ID;

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(service.discord.clientId).toBeUndefined();
      });
    });

    describe('botToken', () => {
      it('should return DISCORD_BOT_TOKEN from environment', async () => {
        process.env.DISCORD_PUBLIC_KEY = 'test-key';
        process.env.DISCORD_BOT_TOKEN = 'bot-token-xyz';

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(service.discord.botToken).toBe('bot-token-xyz');
      });

      it('should return undefined when DISCORD_BOT_TOKEN is not set', async () => {
        process.env.DISCORD_PUBLIC_KEY = 'test-key';
        delete process.env.DISCORD_BOT_TOKEN;

        const module: TestingModule = await Test.createTestingModule({
          providers: [ConfigService],
        }).compile();

        service = module.get<ConfigService>(ConfigService);

        expect(service.discord.botToken).toBeUndefined();
      });
    });
  });

  describe('get', () => {
    it('should return value when key exists', async () => {
      process.env.DISCORD_PUBLIC_KEY = 'test-key';
      process.env.CUSTOM_VAR = 'custom-value';

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.get('CUSTOM_VAR')).toBe('custom-value');
    });

    it('should return default value when key does not exist', async () => {
      process.env.DISCORD_PUBLIC_KEY = 'test-key';
      delete process.env.MISSING_VAR;

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.get('MISSING_VAR', 'default')).toBe('default');
    });

    it('should return empty string when key does not exist and no default provided', async () => {
      process.env.DISCORD_PUBLIC_KEY = 'test-key';
      delete process.env.MISSING_VAR;

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      expect(service.get('MISSING_VAR')).toBe('');
    });
  });
});
