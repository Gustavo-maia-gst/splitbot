import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  async loadTextFile(relativePath: string): Promise<string> {
    try {
      const fullPath = path.join(process.cwd(), relativePath);
      return await fs.readFile(fullPath, 'utf8');
    } catch (err) {
      this.logger.error(`Error loading file: ${relativePath}`, err);
      throw err;
    }
  }

  async loadPrompt(name: string): Promise<string> {
    const promptPath = `src/llm/prompts/${name}.md`;
    try {
      return await this.loadTextFile(promptPath);
    } catch (err) {
      throw new Error('Could not load prompt ' + name);
    }
  }

  async loadSkill(name: string): Promise<string> {
    const path = `src/mcp/specializations/${name}/SKILL.md`;
    try {
      return await this.loadTextFile(path);
    } catch {
      this.logger.warn(`Skill not found: ${name}`);
      throw new Error(`Skill ${name} not found in ${path}`);
    }
  }
}
