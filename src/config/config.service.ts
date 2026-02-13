import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get port(): number {
    return parseInt(process.env.PORT || '3000', 10);
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get discord() {
    return {
      publicKey: this.getRequired('DISCORD_PUBLIC_KEY'),
      clientId: process.env.DISCORD_CLIENT_ID,
      botToken: process.env.DISCORD_BOT_TOKEN,
    };
  }

  private getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }
}
