import { GetLogContextTool } from './gcp/logs_explorer/get_log_context/get-log-context.tool';
import { ListLogsTool } from './gcp/logs_explorer/list_logs/list-logs.tool';
import { ListSqlInstancesTool } from './gcp/database_status/list_sql_instances/list-sql-instances.tool';
import { DetailSqlInstanceTool } from './gcp/database_status/detail_sql_instance/detail-sql-instance.tool';
import { ListRepositoriesTool } from './github/list_repositories/list-repositories.tool';
import { ListCommitsTool } from './github/list_commits/list-commits.tool';
import { ListReleasesTool } from './github/list_releases/list-releases.tool';

export const TOOLS = [
  ListLogsTool,
  GetLogContextTool,
  ListSqlInstancesTool,
  DetailSqlInstanceTool,
  ListRepositoriesTool,
  ListCommitsTool,
  ListReleasesTool,
];
