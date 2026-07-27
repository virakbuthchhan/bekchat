import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { ChatGateway } from '../websockets/chat.gateway';
import { WebhooksService } from '../webhooks/webhooks.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private webhooksService: WebhooksService,
    private notificationsService: NotificationsService,
  ) {}

  async createMessage(userId: string, dto: CreateMessageDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
      include: { members: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    let isMember = channel.members.some((m) => m.userId === userId);
    if (!isMember) {
      if (channel.type === 'PUBLIC') {
        // Auto-join user to public channel
        await this.prisma.channelMember.create({
          data: { channelId: dto.channelId, userId },
        });
        isMember = true;
      } else {
        throw new ForbiddenException('You must be a channel member to send messages');
      }
    }

    if (!dto.content?.trim() && (!dto.attachments || dto.attachments.length === 0)) {
      throw new BadRequestException('Message must contain content or an attachment');
    }

    const message = await this.prisma.message.create({
      data: {
        channelId: dto.channelId,
        senderId: userId,
        content: dto.content || '',
        formatting: dto.formatting || 'markdown',
        parentId: dto.parentId,
        attachments: dto.attachments
          ? {
              create: dto.attachments.map((att) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                mimeType: att.mimeType,
              })),
            }
          : undefined,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        parent: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        attachments: true,
        reactions: true,
      },
    });

    // 1. Emit real-time WebSocket event using ChatGateway helper (adds "channel:" prefix)
    this.chatGateway.emitMessageNew(dto.channelId, message);

    // 2. Scan content for @username mentions
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = Array.from(dto.content.matchAll(mentionRegex));
    const mentionedUsernames = Array.from(new Set(matches.map((m) => m[1])));

    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await this.prisma.user.findMany({
        where: { username: { in: mentionedUsernames } },
      });

      for (const targetUser of mentionedUsers) {
        if (targetUser.id !== userId) {
          const notif = await this.notificationsService.createNotification({
            userId: targetUser.id,
            type: 'MENTION',
            title: `Mentioned by @${message.sender?.username || 'User'}`,
            content: dto.content.substring(0, 100),
            channelId: dto.channelId,
          });

          // Send real-time notification update to mentioned user
          this.chatGateway.server.emit(`user_notification:${targetUser.id}`, notif);
        }
      }
    }

    // 3. Trigger Outgoing Webhooks
    this.webhooksService.dispatchOutgoingEvent(channel.workspaceId, 'message.created', {
      messageId: message.id,
      channelId: message.channelId,
      sender: message.sender,
      content: message.content,
      createdAt: message.createdAt,
    });

    return message;
  }

  async getChannelMessages(channelId: string, limit = 50, beforeMessageId?: string, parentId?: string) {
    const take = typeof limit === 'number' && !isNaN(limit) && limit > 0 ? limit : 50;
    let whereClause: any = { channelId };

    if (parentId !== undefined) {
      whereClause.parentId = parentId;
    }

    if (beforeMessageId) {
      const beforeMsg = await this.prisma.message.findUnique({
        where: { id: beforeMessageId },
      });
      if (beforeMsg) {
        whereClause.createdAt = { lt: beforeMsg.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        parent: {
          select: {
            id: true,
            content: true,
            sender: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        attachments: true,
        reactions: {
          include: { user: { select: { username: true } } },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    return { messages };
  }

  async searchMessages(workspaceId: string, query: string) {
    if (!query) return { messages: [] };
    const messages = await this.prisma.message.findMany({
      where: {
        channel: { workspaceId },
        content: { contains: query, mode: 'insensitive' },
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        channel: { select: { id: true, name: true } },
      },
    });
    return { messages };
  }

  async getThreadReplies(parentId: string) {
    return this.prisma.message.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        attachments: true,
        reactions: true,
      },
    });
  }

  async updateMessage(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        editedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        attachments: true,
        reactions: true,
      },
    });

    this.chatGateway.emitMessageUpdate(message.channelId, updated);
    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    this.chatGateway.emitMessageDelete(message.channelId, messageId);

    return { success: true };
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    let message: any;

    if (existing) {
      await this.prisma.reaction.delete({
        where: { id: existing.id },
      });
      message = await this.prisma.message.findUnique({ where: { id: messageId } });
    } else {
      await this.prisma.reaction.create({
        data: { messageId, userId, emoji },
      });
      message = await this.prisma.message.findUnique({ where: { id: messageId } });
    }

    if (message) {
      this.chatGateway.emitReactionChange(message.channelId, { messageId, emoji });
    }

    return { success: true };
  }
}
