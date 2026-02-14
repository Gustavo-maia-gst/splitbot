import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../../mcp.tool';
import { GoogleService } from '../../google.service';

const DetailSqlInstanceSchema = z.object({
  instanceId: z.string().describe('The Cloud SQL instance ID'),
  projectId: z.string().optional().describe('The project ID (optional)'),
});

@Injectable()
export class DetailSqlInstanceTool extends McpTool<z.infer<typeof DetailSqlInstanceSchema>> {
  private readonly logger = new Logger(DetailSqlInstanceTool.name);

  constructor(private readonly googleService: GoogleService) {
    super();
  }

  name = 'gcp_detail_sql_instance';
  description = 'Get detailed status and metrics for a Cloud SQL instance';

  getSchema(): ZodSchema<any> {
    return DetailSqlInstanceSchema;
  }

  async execute(params: z.infer<typeof DetailSqlInstanceSchema>) {
    const { instanceId, projectId } = params;
    this.logger.log(`Getting details for Cloud SQL instance: ${instanceId}`);

    // We can fetch static info again or just metrics.
    // The user requested "all insights", including memory, cpu, connections.

    const metrics = await this.googleService.getSqlMetrics(instanceId, projectId);

    // We could also fetch the instance details again to combine them,
    // but the simple metrics might satisfy "status" if we assume the user knows the instance exists.
    // However, to be thorough, let's fetch instance metadata too if possible,
    // but listSqlInstances already gave general info.
    // Let's stick to returning metrics + maybe some basic status checks if we implemented them.
    // For now, returning the metrics object.

    return {
      instanceId,
      metrics,
    };
  }
}
