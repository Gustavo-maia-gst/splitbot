import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../../mcp.tool';
import { GoogleService } from '../../google.service';
import { FileService } from '@/common/file.service';

const ListLogsSchema = z.object({
  filters: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of filter strings using GCP logging filter syntax, it may be just a string to be searched across logs',
    ),

  limit: z.number().optional().default(100).describe('Max number of logs to return'),

  hours: z
    .number()
    .optional()
    .default(1)
    .describe('Number of hours to look back (default 1). Max 168 (7 days).'),
});

@Injectable()
export class ListLogsTool extends McpTool<z.infer<typeof ListLogsSchema>> {
  name = 'gcp_list_logs';
  description =
    'List logs from Google Cloud Platform. Dates default to last 1 hour if not specified. Max range is 7 days. Use filters and hours to narrow down search.';
  private readonly logger = new Logger(ListLogsTool.name);

  constructor(
    private readonly googleService: GoogleService,
    private readonly fileService: FileService,
  ) {
    super();
  }

  getSchema(): ZodSchema<z.infer<typeof ListLogsSchema>> {
    return ListLogsSchema;
  }

  async skill() {
    return await this.fileService.loadSkill('gcp/logs_explorer/list_logs');
  }

  async execute(params: z.infer<typeof ListLogsSchema>) {
    const { filters, limit, hours } = params;

    if (hours > 168) {
      throw new Error('Time range cannot exceed 168 hours (7 days).');
    }

    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

    this.logger.log(`Listing logs with filters: ${filters.join('\n')}`);

    return this.googleService.listLogs(filters, start, end, limit);
  }
}
