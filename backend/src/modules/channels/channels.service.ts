import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChannelDto, CreateDirectMessageDto } from './dto/channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async createChannel(userId: string, dto: CreateChannelDto) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: dto.workspaceId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const type = dto.isPrivate ? 'PRIVATE' : dto.type || 'PUBLIC';

    const channel = await this.prisma.channel.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name.toLowerCase().replace(/\s+/g, '-'),
        topic: dto.topic,
        isPrivate: dto.isPrivate || type === 'PRIVATE',
        type,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
      },
    });

    return channel;
  }

  async getOrCreateDirectMessage(userId: string, dto: CreateDirectMessageDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException('Cannot create a DM channel with yourself');
    }

    // Check existing DM channel between userId and targetUserId in workspace
    const existingDm = await this.prisma.channel.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        type: 'DIRECT_MESSAGE',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, status: true } },
          },
        },
      },
    });

    if (existingDm) {
      return existingDm;
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const newDm = await this.prisma.channel.create({
      data: {
        workspaceId: dto.workspaceId,
        name: `dm-${userId.substring(0, 4)}-${dto.targetUserId.substring(0, 4)}`,
        type: 'DIRECT_MESSAGE',
        isPrivate: true,
        members: {
          create: [
            { userId },
            { userId: dto.targetUserId },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, status: true } },
          },
        },
      },
    });

    return newDm;
  }

  async getWorkspaceChannels(workspaceId: string, userId: string) {
    return this.prisma.channel.findMany({
      where: {
        workspaceId,
        OR: [
          { type: 'PUBLIC' },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, status: true } },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getChannelDetails(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true, status: true } },
          },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check membership for private channels
    if (channel.isPrivate) {
      const isMember = channel.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('Access denied to private channel');
      }
    }

    return channel;
  }

  async joinChannel(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isPrivate) {
      throw new ForbiddenException('Cannot self-join a private channel');
    }

    return this.prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId },
      update: {},
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async updateReadReceipt(channelId: string, userId: string, lastReadMessageId?: string) {
    return this.prisma.channelMember.update({
      where: { channelId_userId: { channelId, userId } },
      data: {
        unreadCount: 0,
        ...(lastReadMessageId && { lastReadMessageId }),
      },
    });
  }
}
