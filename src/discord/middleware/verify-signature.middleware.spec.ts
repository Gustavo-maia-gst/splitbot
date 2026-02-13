import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as nacl from 'tweetnacl';
import { VerifySignatureMiddleware } from './verify-signature.middleware';
import { ConfigService } from '@config/config.service';

jest.mock('tweetnacl');

describe('VerifySignatureMiddleware', () => {
  let middleware: VerifySignatureMiddleware;
  let configService: ConfigService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifySignatureMiddleware,
        {
          provide: ConfigService,
          useValue: {
            discord: {
              publicKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
            },
          },
        },
      ],
    }).compile();

    middleware = module.get<VerifySignatureMiddleware>(VerifySignatureMiddleware);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
    };
    mockResponse = {};
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('signature verification', () => {
    describe('when signature is valid', () => {
      it('should call next() and allow request', () => {
        mockRequest.headers = {
          'x-signature-ed25519': 'valid-signature',
          'x-signature-timestamp': '1234567890',
        };
        mockRequest.body = { type: 1 };

        (nacl.sign.detached.verify as jest.Mock).mockReturnValue(true);

        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(nacl.sign.detached.verify).toHaveBeenCalled();
      });

      it('should verify with correct parameters', () => {
        const signature = 'abcd1234';
        const timestamp = '1234567890';
        const body = { type: 1, data: 'test' };

        mockRequest.headers = {
          'x-signature-ed25519': signature,
          'x-signature-timestamp': timestamp,
        };
        mockRequest.body = body;

        (nacl.sign.detached.verify as jest.Mock).mockReturnValue(true);

        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(nacl.sign.detached.verify).toHaveBeenCalledWith(
          Buffer.from(timestamp + JSON.stringify(body)),
          Buffer.from(signature, 'hex'),
          Buffer.from(configService.discord.publicKey, 'hex'),
        );
      });
    });

    describe('when signature is invalid', () => {
      it('should throw UnauthorizedException', () => {
        mockRequest.headers = {
          'x-signature-ed25519': 'invalid-signature',
          'x-signature-timestamp': '1234567890',
        };
        mockRequest.body = { type: 1 };

        (nacl.sign.detached.verify as jest.Mock).mockReturnValue(false);

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(UnauthorizedException);

        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should throw with correct error message', () => {
        mockRequest.headers = {
          'x-signature-ed25519': 'bad-sig',
          'x-signature-timestamp': '1234567890',
        };
        mockRequest.body = { type: 1 };

        (nacl.sign.detached.verify as jest.Mock).mockReturnValue(false);

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow('Invalid request signature');
      });
    });
  });

  describe('missing headers', () => {
    describe('when signature header is missing', () => {
      it('should throw UnauthorizedException', () => {
        mockRequest.headers = {
          'x-signature-timestamp': '1234567890',
        };
        mockRequest.body = { type: 1 };

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(UnauthorizedException);

        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should throw with correct error message', () => {
        mockRequest.headers = {
          'x-signature-timestamp': '1234567890',
        };

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow('Missing signature headers');
      });
    });

    describe('when timestamp header is missing', () => {
      it('should throw UnauthorizedException', () => {
        mockRequest.headers = {
          'x-signature-ed25519': 'signature',
        };
        mockRequest.body = { type: 1 };

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(UnauthorizedException);

        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should throw with correct error message', () => {
        mockRequest.headers = {
          'x-signature-ed25519': 'signature',
        };

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow('Missing signature headers');
      });
    });

    describe('when both headers are missing', () => {
      it('should throw UnauthorizedException', () => {
        mockRequest.headers = {};
        mockRequest.body = { type: 1 };

        expect(() => {
          middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        }).toThrow(UnauthorizedException);

        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('different body types', () => {
    it('should handle empty body', () => {
      mockRequest.headers = {
        'x-signature-ed25519': 'signature',
        'x-signature-timestamp': '1234567890',
      };
      mockRequest.body = {};

      (nacl.sign.detached.verify as jest.Mock).mockReturnValue(true);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle complex nested body', () => {
      mockRequest.headers = {
        'x-signature-ed25519': 'signature',
        'x-signature-timestamp': '1234567890',
      };
      mockRequest.body = {
        type: 2,
        data: {
          name: 'command',
          options: [{ name: 'option1', value: 'value1' }],
        },
        member: {
          user: { id: '123', username: 'test' },
        },
      };

      (nacl.sign.detached.verify as jest.Mock).mockReturnValue(true);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(nacl.sign.detached.verify).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(Buffer),
        expect.any(Buffer),
      );
    });
  });
});
