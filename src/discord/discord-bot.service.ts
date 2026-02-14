import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Events, GatewayIntentBits, Message, Partials } from 'discord.js';
import { ConfigService } from '@config/config.service';
import { DiscordMessageHandler } from './discord-message.handler';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly messageHandler: DiscordMessageHandler,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel],
    });

    this.setupEventHandlers();
  }

  async onModuleInit() {
    const { botToken } = this.configService.discord;

    if (!botToken) {
      this.logger.warn('DISCORD_BOT_TOKEN not configured. Bot will not connect.');
      return;
    }

    try {
      await this.client.login(botToken);
      this.logger.log('✅ Discord bot connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Discord bot', error);
      throw error;
    }
  }

  private setupEventHandlers() {
    this.client.on(Events.ClientReady, (client) => {
      this.logger.log(`🤖 Bot logged in as ${client.user.tag}`);
      this.logger.log(`📊 Serving ${client.guilds.cache.size} guilds`);
    });

    this.client.on(Events.Error, (error) => {
      this.logger.error('Discord client error', error);
    });

    this.client.on(Events.GuildCreate, (guild) => {
      this.logger.log(`➕ Bot added to guild: ${guild.name} (${guild.id})`);
    });

    this.client.on(Events.GuildDelete, (guild) => {
      this.logger.log(`➖ Bot removed from guild: ${guild.name} (${guild.id})`);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message) {
    if (this.client.user) {
      await this.messageHandler.handleMessage(message, this.client.user);
    }
  }

  getClient(): Client {
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.logger.log('Discord bot disconnected');
    }
  }
}
