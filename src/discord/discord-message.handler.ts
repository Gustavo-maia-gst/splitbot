import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { LlmService } from '../llm/llm.service';
import { splitMessage } from '../common/utils/string.utils';

@Injectable()
export class DiscordMessageHandler {
  private readonly logger = new Logger(DiscordMessageHandler.name);

  constructor(private readonly llmService: LlmService) {}

  async handleMessage(message: Message, clientUser: any) {
    // Ignore messages from bots (unless it's self, but we usually ignore self in trigger, but here we process history)
    if (message.author.bot) return;

    // Check if bot was mentioned (user or role)
    const botMentioned = message.mentions.has(clientUser.id);
    const roleMentioned = message.mentions.roles.some((role) =>
      message.guild?.members.me?.roles.cache.has(role.id),
    );
    const isReplyToBot =
      message.reference?.messageId && (await message.fetchReference()).author.id === clientUser.id;
    const isDM = message.channel.isDMBased();

    if (
      isDM ||
      botMentioned ||
      roleMentioned ||
      isReplyToBot ||
      message.content.toLowerCase().includes('splitc')
    ) {
      this.logger.log(
        `📨 Received message from ${message.author.tag} in #${message.channel.isDMBased() ? 'DM' : (message.channel as any).name}`,
      );

      try {
        await this.processLlmRequest(message, clientUser);
      } catch (error) {
        this.logger.error('Failed to process message with LLM', error);
        await message.reply('Desculpe, tive um erro ao tentar processar sua mensagem.');
      }
    }
  }

  private async processLlmRequest(message: Message, clientUser: any) {
    // Fetch channel messages
    const messages = await message.channel.messages.fetch({ limit: 100 });

    // Filter messages from the last 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const recentMessages = messages.filter(
      (msg) =>
        msg.createdAt > threeHoursAgo && (!msg.author.bot || msg.author.id === clientUser.id),
    );

    // Sort messages chronologically and map roles
    const sortedMessages = Array.from(recentMessages.values())
      .reverse()
      .map((msg) => {
        const isBot = msg.author.id === clientUser.id;
        return {
          role: isBot ? 'assistant' : 'user',
          content: isBot ? msg.content : `${msg.author.username}: ${msg.content}`,
        };
      });

    this.logger.log(`🤖 Generating LLM response with ${sortedMessages.length} context messages`);

    // Start typing indicator
    const sendTyping = async () => {
      if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
        try {
          await message.channel.sendTyping();
        } catch (err) {
          this.logger.error('Failed to send typing indicator', err);
        }
      }
    };

    await sendTyping();
    const typingInterval = setInterval(sendTyping, 5000);

    try {
      const response = await this.llmService.generateResponse(sortedMessages);
      clearInterval(typingInterval);

      const chunks = splitMessage(response);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } catch (error) {
      clearInterval(typingInterval);
      throw error;
    }
  }
}
