import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../mcp.tool';

const CurlSchema = z.object({
  url: z.string().url().describe('The URL to send the request to'),
  method: z
    .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
    .optional()
    .default('GET')
    .describe('The HTTP method to use'),
  headers: z.object().optional().describe('HTTP headers to include in the request'),

  body: z.string().optional().describe('The body of the request'),
});

@Injectable()
export class CurlTool extends McpTool<z.infer<typeof CurlSchema>> {
  name = 'http_curl';
  description = 'Perform an HTTP request to a specified URL, similar to the curl command.';
  private readonly logger = new Logger(CurlTool.name);

  constructor() {
    super();
  }

  getSchema(): ZodSchema<z.infer<typeof CurlSchema>> {
    return CurlSchema;
  }

  async execute(params: z.infer<typeof CurlSchema>) {
    const { url, method, headers, body } = params;

    this.logger.log(`Executing HTTP ${method} request to ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: headers as HeadersInit,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      });

      const responseText = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseText,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error executing request: ${error.message}`);
        throw new Error(`Failed to execute request: ${error.message}`);
      }
      throw error;
    }
  }
}
