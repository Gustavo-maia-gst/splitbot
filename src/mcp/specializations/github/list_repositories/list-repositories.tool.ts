import { McpTool } from '../../mcp.tool';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { Endpoints } from '@octokit/types';

export class ListRepositoriesTool extends McpTool {
  name = 'list_repositories';
  description = 'List repositories in the splitc-com-br organization';

  getSchema() {
    return z.object({});
  }

  async execute() {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    type ListForOrgResponse = Endpoints['GET /orgs/{org}/repos']['response'];
    const response = (await octokit.rest.repos.listForOrg({
      org: 'splitc-com-br',
      per_page: 100,
    })) as ListForOrgResponse;

    return response.data.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
    }));
  }
}
