import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, CreateApiTokenDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { username: dto.username }],
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email or username already in use');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);

      // Create user. First user registered gets OWNER role.
      const userCount = await this.prisma.user.count();
      const role = userCount === 0 ? 'OWNER' : 'MEMBER';

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          avatarUrl: dto.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${dto.username}`,
          role,
        },
      });

      // Auto create or join default "General" workspace
      let defaultWorkspace = await this.prisma.workspace.findFirst({
        where: { slug: 'general' },
      });

      if (!defaultWorkspace) {
        defaultWorkspace = await this.prisma.workspace.create({
          data: {
            name: 'General Workspace',
            slug: 'general',
            ownerId: user.id,
            channels: {
              create: [
                { name: 'general', topic: 'General discussion', type: 'PUBLIC' },
                { name: 'random', topic: 'Random chat & fun', type: 'PUBLIC' },
              ],
            },
          },
        });
      }

      // Join workspace member
      await this.prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: defaultWorkspace.id, userId: user.id } },
        create: { workspaceId: defaultWorkspace.id, userId: user.id, role: role === 'OWNER' ? 'ADMIN' : 'MEMBER' },
        update: {},
      });

      // Join channels
      const channels = await this.prisma.channel.findMany({
        where: { workspaceId: defaultWorkspace.id, type: 'PUBLIC' },
      });

      for (const ch of channels) {
        await this.prisma.channelMember.upsert({
          where: { channelId_userId: { channelId: ch.id, userId: user.id } },
          create: { channelId: ch.id, userId: user.id },
          update: {},
        });
      }

      const token = this.generateJwt(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: user.status,
        },
        accessToken: token,
      };
    } catch (error: any) {
      console.error('[AuthService.register Error]:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message || 'Registration failed');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid email or password');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ONLINE' },
      });

      const token = this.generateJwt(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: 'ONLINE',
        },
        accessToken: token,
      };
    } catch (error: any) {
      console.error('[AuthService.login Error]:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message || 'Login failed');
    }
  }

  private generateJwt(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async createApiToken(userId: string, dto: CreateApiTokenDto) {
    const rawToken = `bek_${crypto.randomBytes(24).toString('hex')}`;

    const apiToken = await this.prisma.apiToken.create({
      data: {
        userId,
        name: dto.name,
        token: rawToken,
      },
    });

    return {
      id: apiToken.id,
      name: apiToken.name,
      token: rawToken,
      createdAt: apiToken.createdAt,
    };
  }

  async listApiTokens(userId: string) {
    return this.prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteApiToken(userId: string, tokenId: string) {
    const token = await this.prisma.apiToken.findUnique({
      where: { id: tokenId },
    });

    if (!token || token.userId !== userId) {
      throw new BadRequestException('API Token not found or access denied');
    }

    await this.prisma.apiToken.delete({
      where: { id: tokenId },
    });

    return { success: true };
  }
}
