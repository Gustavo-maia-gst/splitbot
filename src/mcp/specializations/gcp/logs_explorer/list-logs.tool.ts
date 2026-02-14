import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../mcp.tool';
import { GoogleService } from '../google.service';

const ListLogsSchema = z.object({
  filters: z
    .array(z.string())
    .min(1)
    .describe('Array of filter strings using GCP logging filter syntax'),
  limit: z.number().optional().default(100).describe('Max number of logs to return'),
  start_time: z.iso.datetime().optional().describe('ISO 8601 start timestamp'),
  end_time: z.iso.datetime().optional().describe('ISO 8601 end timestamp'),
});

@Injectable()
export class ListLogsTool implements McpTool<z.infer<typeof ListLogsSchema>> {
  name = 'gcp_list_logs';
  description =
    'List logs from Google Cloud Platform. Dates default to last 1 hour if not specified. Max range is 7 days.';
  private readonly logger = new Logger(ListLogsTool.name);

  constructor(private readonly googleService: GoogleService) {}

  getSchema(): ZodSchema<any> {
    return ListLogsSchema;
  }

  async execute(params: z.infer<typeof ListLogsSchema>) {
    const { filters, limit, start_time, end_time } = params;

    const start = start_time ? new Date(start_time) : new Date(Date.now() - 1000 * 60 * 60); // Default 1 hour ago
    const end = end_time ? new Date(end_time) : new Date();

    // Validate range is not > 7 days
    const diff = end.getTime() - start.getTime();
    if (diff > 7 * 24 * 60 * 60 * 1000) {
      throw new Error('Date range cannot exceed 7 days.');
    }

    this.logger.log(`Listing logs with filters: ${filters.join(', ')}`);

    return this.googleService.listLogs(filters, start, end, limit);
  }
}
