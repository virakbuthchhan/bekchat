import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto, InviteMemberDto } from './dto/workspace.dto';
import { MemberRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException('Workspace slug already taken');
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: MemberRole.ADMIN,
          },
        },
        channels: {
          create: [
            { name: 'general', topic: 'Company-wide announcements and work-based matters' },
            { name: 'random', topic: 'Non-work banter and water cooler chat' },
          ],
        },
      },
      include: {
        channels: true,
      },
    });

    // Auto add owner as member of created public channels
    for (const channel of workspace.channels) {
      await this.prisma.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
        },
      });
    }

    return workspace;
  }

  async getUserWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        _count: { select: { members: true, channels: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getWorkspaceById(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, email: true, avatarUrl: true, status: true } } },
        },
        channels: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Access denied');
    }

    return workspace;
  }

  async updateWorkspace(userId: string, workspaceId: string, data: { name?: string; iconUrl?: string }) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member || member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only workspace admins can update workspace settings');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });
  }

  async getWorkspaceMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true, status: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  async inviteMember(userId: string, workspaceId: string, dto: InviteMemberDto) {
    const adminMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!adminMember || adminMember.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only workspace admins can invite members');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.emailOrUsername }, { username: dto.emailOrUsername }],
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User with that email or username not found');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this workspace');
    }

    const newMember = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: dto.role || MemberRole.MEMBER,
      },
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true, status: true } },
      },
    });

    // Auto join public channels
    const publicChannels = await this.prisma.channel.findMany({
      where: { workspaceId, type: 'PUBLIC' },
    });

    for (const ch of publicChannels) {
      await this.prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: ch.id, userId: targetUser.id } },
        create: { channelId: ch.id, userId: targetUser.id },
        update: {},
      });
    }

    return newMember;
  }

  async updateMemberRole(userId: string, workspaceId: string, memberId: string, role: MemberRole) {
    const adminMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!adminMember || adminMember.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only workspace admins can update member roles');
    }

    return this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true, status: true } },
      },
    });
  }

  async removeMember(userId: string, workspaceId: string, memberId: string) {
    const adminMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!adminMember || adminMember.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Only workspace admins can remove members');
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
}
