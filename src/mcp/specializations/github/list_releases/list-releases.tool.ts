import { McpTool } from '../../mcp.tool';
import { z } from 'zod';
import { Octokit } from 'octokit';
import { Endpoints } from '@octokit/types';

export class ListReleasesTool extends McpTool {
  name = 'github___list_releases';
  description =
    'List the last 10 releases/tags for a repository, including associated commits since the previous release.';

  getSchema() {
    return z.object({
      repo: z.string().describe('Repository name'),
    });
  }

  async execute({ repo }: { repo: string }) {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Get tags (using listTags gives us commit SO)
    type ListTagsResponse = Endpoints['GET /repos/{owner}/{repo}/tags']['response'];
    const tagsResponse = (await octokit.rest.repos.listTags({
      owner: 'splitc-com-br',
      repo,
      per_page: 11, // Need n+1 to compare n intervals
    })) as ListTagsResponse;

    const tags = tagsResponse.data;

    const releases = [];

    // Iterate through tags to find commits between them
    for (let i = 0; i < Math.min(tags.length, 10); i++) {
      const currentTag = tags[i];
      const previousTag = tags[i + 1]; // Can be undefined for the last one

      let commits: { sha: string; message: string; author?: string | null }[] = [];
      if (previousTag) {
        try {
          // Compare previous...current
          type CompareCommitsResponse =
            Endpoints['GET /repos/{owner}/{repo}/compare/{basehead}']['response'];
          const compareResponse = (await octokit.rest.repos.compareCommitsWithBasehead({
            owner: 'splitc-com-br',
            repo,
            basehead: `${previousTag.name}...${currentTag.name}`,
          })) as CompareCommitsResponse;
          const compare = compareResponse.data;

          commits = compare.commits.map((c) => ({
            sha: c.sha,
            message: c.commit.message,
            author: c.commit.author?.name,
          }));
        } catch (e) {
          commits = [{ sha: '', message: 'Error comparing commits or initial release' }];
        }
      } else {
        commits = [
          { sha: '', message: 'Oldest tag in this list (no previous tag fetched to compare)' },
        ];
      }

      releases.push({
        tag: currentTag.name,
        sha: currentTag.commit.sha,
        commits,
      });
    }

    return releases;
  }
}
