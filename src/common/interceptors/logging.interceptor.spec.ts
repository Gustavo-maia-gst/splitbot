import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  beforeEach(() => {
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({
          method: 'POST',
          url: '/test-url',
        }),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('test response')),
    };

    jest.clearAllMocks();
  });

  describe('intercept', () => {
    describe('when handling request', () => {
      it('should call next handler', (done) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(mockCallHandler.handle).toHaveBeenCalled();
          done();
        });
      });

      it('should return the response from handler', (done) => {
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
          expect(result).toBe('test response');
          done();
        });
      });
    });

    describe('logging behavior', () => {
      it('should log request with method and URL', (done) => {
        const logSpy = jest.spyOn(interceptor['logger'], 'log');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('POST'));
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/test-url'));
          done();
        });
      });

      it('should log response time', (done) => {
        const logSpy = jest.spyOn(interceptor['logger'], 'log');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('ms'));
          done();
        });
      });

      it('should log different HTTP methods', (done) => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        let completed = 0;

        methods.forEach((method) => {
          const logSpy = jest.spyOn(interceptor['logger'], 'log');
          mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnValue({
              getRequest: () => ({
                method,
                url: '/test',
              }),
            }),
          } as any;

          interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(method));
            completed++;
            if (completed === methods.length) {
              done();
            }
          });
        });
      });
    });

    describe('different URLs', () => {
      it('should log different endpoint URLs', (done) => {
        const urls = ['/discord/interactions', '/discord/verify-user', '/health'];
        let completed = 0;

        urls.forEach((url) => {
          const logSpy = jest.spyOn(interceptor['logger'], 'log');
          mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnValue({
              getRequest: () => ({
                method: 'POST',
                url,
              }),
            }),
          } as any;

          interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(url));
            completed++;
            if (completed === urls.length) {
              done();
            }
          });
        });
      });
    });

    describe('response time calculation', () => {
      it('should calculate and log response time', (done) => {
        const logSpy = jest.spyOn(interceptor['logger'], 'log');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          const logCall = logSpy.mock.calls[0][0];
          const timeMatch = logCall.match(/(\d+)ms/);

          expect(timeMatch).toBeTruthy();
          expect(Number(timeMatch![1])).toBeGreaterThanOrEqual(0);
          done();
        });
      });
    });
  });
});
