import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { ConfigService } from '@config/config.service';

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: Client;

  constructor(private readonly configService: ConfigService) {
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

        this.logger.log(`\n📜 Channel Message History (${messages.size} messages):`);
        this.logger.log('='.repeat(80));

        // Print messages in chronological order (oldest first)
        const sortedMessages = Array.from(messages.values()).reverse();

        sortedMessages.forEach((msg, index) => {
          const timestamp = msg.createdAt.toISOString();
          const author = msg.author.tag;
          const content = msg.content || '[No content - may have embeds/attachments]';

          this.logger.log(`${index + 1}. [${timestamp}] ${author}: ${content}`);

          if (msg.attachments.size > 0) {
            msg.attachments.forEach((att) => {
              this.logger.log(`   📎 Attachment: ${att.name} (${att.url})`);
            });
          }
        });

        this.logger.log('='.repeat(80));

        // Reply to the message
        await message.reply(
          `Olá! Li ${messages.size} mensagens deste canal. Verifique os logs para detalhes.`,
        );
      } catch (error) {
        this.logger.error('Failed to fetch messages', error);
        await message.reply('Desculpe, não consegui ler as mensagens do canal.');
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
