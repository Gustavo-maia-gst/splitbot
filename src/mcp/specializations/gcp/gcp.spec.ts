import { Test, TestingModule } from '@nestjs/testing';
import { GoogleService } from './google.service';
import { ConfigService } from '@config/config.service';
import { ListLogsTool } from './logs_explorer/list_logs/list-logs.tool';
import { GetLogContextTool } from './logs_explorer/get_log_context/get-log-context.tool';

// Mock @google-cloud/logging
const mockGetEntries = jest.fn();
jest.mock('@google-cloud/logging', () => {
  return {
    Logging: jest.fn().mockImplementation(() => {
      return {
        getEntries: mockGetEntries,
      };
    }),
  };
});

describe('GCP Logs Tools', () => {
  let googleService: GoogleService;
  let listLogsTool: ListLogsTool;
  let getLogContextTool: GetLogContextTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleService,
        ListLogsTool,
        GetLogContextTool,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'GOOGLE_CREDENTIALS_B64') {
                return Buffer.from(JSON.stringify({ project_id: 'test-project' })).toString(
                  'base64',
                );
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    googleService = module.get<GoogleService>(GoogleService);
    listLogsTool = module.get<ListLogsTool>(ListLogsTool);
    getLogContextTool = module.get<GetLogContextTool>(GetLogContextTool);

    // Manually trigger onModuleInit to init the mock client
    googleService.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GoogleService', () => {
    it('should be defined', () => {
      expect(googleService).toBeDefined();
    });

    it('should initialize logging client', () => {
      expect(googleService.getLoggingClient()).toBeDefined();
    });
  });

  describe('ListLogsTool', () => {
    it('should list logs with filters', async () => {
      mockGetEntries.mockResolvedValue([
        [
          {
            metadata: {
              insertId: '123',
              timestamp: new Date(),
              textPayload: 'test log',
              severity: 'INFO',
              resource: { type: 'global' },
            },
          },
        ],
      ]);

      const result = await listLogsTool.execute({
        filters: ['severity="INFO"'],
        limit: 10,
        hours: 1,
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('severity="INFO"'),
          pageSize: 10,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].insertId).toBe('123');
    });

    it('should throw error if hours > 168', async () => {
      await expect(
        listLogsTool.execute({
          filters: ['test'],
          limit: 100,
          hours: 169,
        }),
      ).rejects.toThrow('Time range cannot exceed 168 hours (7 days).');
    });
  });

  describe('GetLogContextTool', () => {
    it('should get log context by insertId', async () => {
      const mockEntry = {
        metadata: {
          insertId: 'abc-123',
          jsonPayload: { foo: 'bar' },
        },
      };
      mockGetEntries.mockResolvedValue([[mockEntry]]);

      const result = await getLogContextTool.execute({
        insertId: 'abc-123',
      });

      expect(mockGetEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('insertId = "abc-123"'),
          pageSize: 1,
        }),
      );
      expect(result).toEqual(mockEntry.metadata);
    });

    it('should return message if log not found', async () => {
      mockGetEntries.mockResolvedValue([[]]); // empty array
      const result = await getLogContextTool.execute({ insertId: 'missing' });
      expect(result).toEqual({ message: 'Log not found' });
    });
  });
});
