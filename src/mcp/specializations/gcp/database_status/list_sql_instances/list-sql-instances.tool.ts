import { Injectable, Logger } from '@nestjs/common';
import { z, ZodSchema } from 'zod';
import { McpTool } from '../../../mcp.tool';
import { GoogleService } from '../../google.service';

const ListSqlInstancesSchema = z.object({
  projectId: z.string().optional().describe('The project ID to list instances for'),
});

@Injectable()
export class ListSqlInstancesTool extends McpTool<z.infer<typeof ListSqlInstancesSchema>> {
  private readonly logger = new Logger(ListSqlInstancesTool.name);

  constructor(private readonly googleService: GoogleService) {
    super();
  }

  name = 'gcp_list_sql_instances';
  description =
    'Lista as instancias de banco de dados do projeto. Existem duas instancias principais, o banco central que é o comissionamento-staging-v5 e o banco efemero que é o ephemeral-tables';

  getSchema(): ZodSchema<z.infer<typeof ListSqlInstancesSchema>> {
    return ListSqlInstancesSchema;
  }

  async execute(params: z.infer<typeof ListSqlInstancesSchema>) {
    this.logger.log('Listing Cloud SQL instances');
    return this.googleService.listSqlInstances(params.projectId);
  }
}
