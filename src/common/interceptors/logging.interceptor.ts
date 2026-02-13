import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestLogger');
  private readonly MAX_BODY_LENGTH = 5000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, headers, body } = request;
    const now = Date.now();

    this.logIncomingRequest(method, url, headers, body);

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        this.logOutgoingResponse(method, url, response.statusCode, data, responseTime);
      }),
    );
  }

  private logIncomingRequest(
    method: string,
    url: string,
    headers: any,
    body: any,
  ): void {
    this.logger.log(`➡️  Incoming Request`);
    this.logger.log(`  Method: ${method}`);
    this.logger.log(`  URL: ${url}`);
    this.logger.verbose(`  Headers: ${this.formatJson(headers)}`);
    
    if (body && Object.keys(body).length > 0) {
      this.logger.verbose(`  Body: ${this.formatJson(body)}`);
    } else {
      this.logger.verbose(`  Body: (empty)`);
    }
  }

  private logOutgoingResponse(
    method: string,
    url: string,
    statusCode: number,
    data: any,
    responseTime: number,
  ): void {
    this.logger.log(`⬅️  Outgoing Response`);
    this.logger.log(`  ${method} ${url} - Status: ${statusCode} - ${responseTime}ms`);
    
    if (data !== undefined && data !== null) {
      this.logger.verbose(`  Body: ${this.formatJson(data)}`);
    } else {
      this.logger.verbose(`  Body: (empty)`);
    }
  }

  private formatJson(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj, null, 2);
      
      if (jsonString.length > this.MAX_BODY_LENGTH) {
        return jsonString.substring(0, this.MAX_BODY_LENGTH) + '\n... [TRUNCATED]';
      }
      
      return jsonString;
    } catch (error) {
      return String(obj);
    }
  }
}
