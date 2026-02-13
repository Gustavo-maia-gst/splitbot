import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { ConfigService } from '@config/config.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmService: LlmService,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
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
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if bot was mentioned
    const botMentioned = message.mentions.has(this.client.user!.id);

    if (botMentioned || message.content.toLowerCase().includes('splitc')) {
      this.logger.log(
        `📨 Received message from ${message.author.tag} in #${message.channel.isDMBased() ? 'DM' : (message.channel as any).name}`,
      );
      this.logger.log(`   Content: ${message.content}`);

      try {
        // Fetch channel messages
        const messages = await message.channel.messages.fetch({ limit: 100 });

        // Filter messages from the last 3 hours
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const recentMessages = messages.filter(
          (msg) => msg.createdAt > threeHoursAgo && !msg.author.bot,
        );

        // Sort messages chronologically
        const sortedMessages = Array.from(recentMessages.values())
          .reverse()
          .map((msg) => ({
            role: 'user',
            content: `${msg.author.username}: ${msg.content}`,
          }));

        // Add the current message if not already included (it should be in fetch results, but just to be sure context is clear)
        // actually fetch usually includes the current message.

        this.logger.log(
          `🤖 Generating LLM response with ${sortedMessages.length} context messages`,
        );

        const response = await this.llmService.generateResponse(sortedMessages);

        // Reply to the message
        await message.reply(response);
      } catch (error) {
        this.logger.error('Failed to process message with LLM', error);
        await message.reply('Desculpe, tive um erro ao tentar processar sua mensagem.');
      }
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
