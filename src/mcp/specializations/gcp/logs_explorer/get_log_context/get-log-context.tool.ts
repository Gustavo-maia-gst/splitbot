import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../../mcp.tool';
import { GoogleService } from '../../google.service';

const GetLogContextSchema = z.object({
  insertId: z.string().describe('The insertId of the log entry'),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe('The timestamp of the log entry for optimized lookup'),
});

@Injectable()
export class GetLogContextTool extends McpTool<z.infer<typeof GetLogContextSchema>> {
  name = 'gcp_get_log_context';
  description = 'Get the full context/entry of a specific log by insertId.';
  private readonly logger = new Logger(GetLogContextTool.name);

  constructor(private readonly googleService: GoogleService) {
    super();
  }

  getSchema(): ZodSchema<any> {
    return GetLogContextSchema;
  }

  async execute(params: z.infer<typeof GetLogContextSchema>) {
    const { insertId, timestamp } = params;
    const ts = timestamp ? new Date(timestamp) : undefined;

    this.logger.log(`Getting log context for ${insertId}`);

    const entry = await this.googleService.getLogEntry(insertId, ts);
    if (!entry) {
      return { message: 'Log not found' };
    }
    return entry;
  }
}
