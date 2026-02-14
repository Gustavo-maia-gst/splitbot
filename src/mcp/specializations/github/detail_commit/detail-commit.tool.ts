import { McpTool } from '../../mcp.tool';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { Endpoints } from '@octokit/types';

export class DetailCommitTool extends McpTool {
  name = 'github___detail_commit';
  description = 'Get detailed information about a specific commit, including file diffs.';

  getSchema() {
    return z.object({
      repo: z.string().describe('Repository name'),
      ref: z.string().describe('Commit SHA or reference'),
    });
  }

  async execute({ repo, ref }: { repo: string; ref: string }) {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    type GetCommitResponse = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response'];
    const commitResponse = (await octokit.rest.repos.getCommit({
      owner: 'splitc-com-br',
      repo,
      ref,
    })) as GetCommitResponse;
    const commit = commitResponse.data;

    return {
      sha: commit.sha,
      author: commit.commit.author,
      message: commit.commit.message,
      date: commit.commit.author?.date,
      stats: commit.stats,
      files: commit.files?.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch, // The actual diff
      })),
      html_url: commit.html_url,
    };
  }
}
