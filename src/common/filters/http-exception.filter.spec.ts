import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
  });

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-url',
      method: 'POST',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;

    jest.clearAllMocks();
  });

  describe('HttpException handling', () => {
    describe('when catching HttpException', () => {
      it('should return correct status code and message', () => {
        const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Test error',
            path: '/test-url',
          }),
        );
      });

      it('should include timestamp in response', () => {
        const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(String),
          }),
        );
      });

      it('should handle different HTTP status codes', () => {
        const statuses = [
          HttpStatus.BAD_REQUEST,
          HttpStatus.UNAUTHORIZED,
          HttpStatus.FORBIDDEN,
          HttpStatus.NOT_FOUND,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ];

        statuses.forEach((status) => {
          jest.clearAllMocks();
          const exception = new HttpException('Error', status);

          filter.catch(exception, mockArgumentsHost);

          expect(mockResponse.status).toHaveBeenCalledWith(status);
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: status,
            }),
          );
        });
      });
    });

    describe('when exception has object response', () => {
      it('should extract message from response object', () => {
        const exception = new HttpException(
          { message: 'Validation failed', errors: ['field1', 'field2'] },
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Validation failed',
          }),
        );
      });

      it('should handle response with array of messages', () => {
        const exception = new HttpException(
          { message: ['Error 1', 'Error 2'] },
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: ['Error 1', 'Error 2'],
          }),
        );
      });
    });
  });

  describe('non-HttpException handling', () => {
    describe('when catching generic Error', () => {
      it('should return 500 status code', () => {
        const exception = new Error('Generic error');

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it('should return generic error message', () => {
        const exception = new Error('Generic error');

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          }),
        );
      });
    });

    describe('when catching unknown exception type', () => {
      it('should handle string exception', () => {
        const exception = 'String error';

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Internal server error',
          }),
        );
      });

      it('should handle null exception', () => {
        const exception = null;

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });

      it('should handle undefined exception', () => {
        const exception = undefined;

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      });
    });
  });

  describe('request context', () => {
    it('should include request URL in error response', () => {
      mockRequest.url = '/discord/interactions';
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/discord/interactions',
        }),
      );
    });

    it('should handle different request methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        jest.clearAllMocks();
        mockRequest.method = method;
        const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.json).toHaveBeenCalled();
      });
    });
  });
});
