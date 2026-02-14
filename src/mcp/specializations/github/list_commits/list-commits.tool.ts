import { McpTool } from '../../mcp.tool';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { Endpoints } from '@octokit/types';

export class ListCommitsTool extends McpTool {
  name = 'list_commits';
  description =
    'List commits for a repository, filtering out commits by fluxbot. Returns a summary including changed files for the latest commits.';

  getSchema() {
    return z.object({
      repo: z.string().describe('Repository name'),
    });
  }

  async execute({ repo }: { repo: string }) {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Fetch commits
    // https://docs.github.com/en/rest/commits/commits?apiVersion=2022-11-28#list-commits
    type ListCommitsResponse = Endpoints['GET /repos/{owner}/{repo}/commits']['response'];
    const commitsResponse = (await octokit.rest.repos.listCommits({
      owner: 'splitc-com-br',
      repo,
      per_page: 20, // Fetch top 20
    })) as ListCommitsResponse;

    const commits = commitsResponse.data;

    // Filter out fluxbot
    const filteredCommits = commits.filter((commit) => {
      const authorLogin = commit.author?.login;
      const authorName = commit.commit.author?.name;
      const fluxbotNames = ['fluxbot', 'flux-bot', 'github-actions[bot]'];
      return (
        !fluxbotNames.includes(authorLogin?.toLowerCase() || '') &&
        !fluxbotNames.includes(authorName?.toLowerCase() || '')
      );
    });

    // Enhance with file details for the filtered list
    type GetCommitResponse = Endpoints['GET /repos/{owner}/{repo}/commits/{ref}']['response'];

    const detailedCommits = await Promise.all(
      filteredCommits.map(async (commit) => {
        try {
          const detailResponse = (await octokit.rest.repos.getCommit({
            owner: 'splitc-com-br',
            repo,
            ref: commit.sha,
          })) as GetCommitResponse;
          const detail = detailResponse.data;

          return {
            sha: detail.sha,
            message: detail.commit.message,
            author: detail.commit.author?.name || detail.author?.login,
            date: detail.commit.author?.date,
            files: detail.files?.map((f) => f.filename) || [],
            stats: detail.stats,
            html_url: detail.html_url,
          };
        } catch (error) {
          return {
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name,
            date: commit.commit.author?.date,
            files: ['Error fetching details'],
            html_url: commit.html_url,
          };
        }
      }),
    );

    return detailedCommits;
  }
}
