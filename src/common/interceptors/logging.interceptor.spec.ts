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
          headers: { 'content-type': 'application/json' },
          body: { test: 'data' },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ result: 'success' })),
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
          expect(result).toEqual({ result: 'success' });
          done();
        });
      });
    });

    describe('logging behavior', () => {
      it('should log incoming request with method and URL', (done) => {
        const logSpy = jest.spyOn(interceptor['logger'], 'log');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(logSpy).toHaveBeenCalledWith('➡️  Incoming Request');
          expect(logSpy).toHaveBeenCalledWith('  Method: POST');
          expect(logSpy).toHaveBeenCalledWith('  URL: /test-url');
          done();
        });
      });

      it('should log request headers', (done) => {
        const verboseSpy = jest.spyOn(interceptor['logger'], 'verbose');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('Headers:'));
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('content-type'));
          done();
        });
      });

      it('should log request body', (done) => {
        const verboseSpy = jest.spyOn(interceptor['logger'], 'verbose');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('Body:'));
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('test'));
          done();
        });
      });

      it('should log outgoing response with status code', (done) => {
        const logSpy = jest.spyOn(interceptor['logger'], 'log');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(logSpy).toHaveBeenCalledWith('⬅️  Outgoing Response');
          expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status: 200'));
          done();
        });
      });

      it('should log response body', (done) => {
        const verboseSpy = jest.spyOn(interceptor['logger'], 'verbose');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('result'));
          expect(verboseSpy).toHaveBeenCalledWith(expect.stringContaining('success'));
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
    });

    describe('empty body handling', () => {
      it('should log (empty) for empty request body', (done) => {
        mockExecutionContext = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: () => ({
              method: 'GET',
              url: '/test',
              headers: {},
              body: {},
            }),
            getResponse: () => ({ statusCode: 200 }),
          }),
        } as any;

        const verboseSpy = jest.spyOn(interceptor['logger'], 'verbose');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(verboseSpy).toHaveBeenCalledWith('  Body: (empty)');
          done();
        });
      });

      it('should log (empty) for null response body', (done) => {
        mockCallHandler = {
          handle: jest.fn().mockReturnValue(of(null)),
        };

        const verboseSpy = jest.spyOn(interceptor['logger'], 'verbose');

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
          expect(verboseSpy).toHaveBeenCalledWith('  Body: (empty)');
          done();
        });
      });
    });

    describe('different HTTP methods', () => {
      it('should log different methods correctly', (done) => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        let completed = 0;

        methods.forEach((method) => {
          const logSpy = jest.spyOn(interceptor['logger'], 'log');
          mockExecutionContext = {
            switchToHttp: jest.fn().mockReturnValue({
              getRequest: () => ({
                method,
                url: '/test',
                headers: {},
                body: {},
              }),
              getResponse: () => ({ statusCode: 200 }),
            }),
          } as any;

          interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
            expect(logSpy).toHaveBeenCalledWith(`  Method: ${method}`);
            completed++;
            if (completed === methods.length) {
              done();
            }
          });
        });
      });
    });
  });
});
