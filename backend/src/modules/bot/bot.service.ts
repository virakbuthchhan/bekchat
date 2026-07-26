import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from '../websockets/chat.gateway';
import { SendBotMessageDto } from './dto/bot.dto';

@Injectable()
export class BotService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async sendMessage(botUserId: string, dto: SendBotMessageDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channel_id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const message = await this.prisma.message.create({
      data: {
        channelId: dto.channel_id,
        senderId: botUserId,
        content: dto.text,
        formatting: dto.formatting || 'markdown',
        parentId: dto.reply_to_message_id || null,
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        attachments: true,
        reactions: true,
      },
    });

    // Broadcast via WebSocket
    this.chatGateway.emitMessageNew(dto.channel_id, message);

    // Save as BotUpdate event
    await this.prisma.botUpdate.create({
      data: {
        payload: {
          update_id: Date.now(),
          message: {
            message_id: message.id,
            from: { id: botUserId },
            chat: { id: channel.id, name: channel.name },
            text: message.content,
            date: message.createdAt.toISOString(),
          },
        },
      },
    });

    return {
      ok: true,
      result: {
        message_id: message.id,
        chat: { id: channel.id, name: channel.name },
        text: message.content,
        date: message.createdAt.toISOString(),
      },
    };
  }

  async getUpdates(offset = 0, limit = 50) {
    const take = Math.min(Number(limit) || 50, 100);
    const updates = await this.prisma.botUpdate.findMany({
      where: {
        updateId: { gte: Number(offset) || 0 },
      },
      take,
      orderBy: { updateId: 'asc' },
    });

    return {
      ok: true,
      result: updates.map((u) => ({
        update_id: u.updateId,
        ...(u.payload as object),
      })),
    };
  }
}
