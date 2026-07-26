import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod',
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Track active sockets
      if (!this.activeUsers.has(userId)) {
        this.activeUsers.set(userId, new Set());
      }
      this.activeUsers.get(userId).add(client.id);

      // Update user status in DB and broadcast
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'ONLINE' },
      });

      this.server.emit('presence:change', { userId, status: 'ONLINE' });
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const userSockets = this.activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.activeUsers.delete(userId);

        await this.prisma.user.update({
          where: { id: userId },
          data: { status: 'OFFLINE' },
        }).catch(() => {});

        this.server.emit('presence:change', { userId, status: 'OFFLINE' });
      }
    }
  }

  @SubscribeMessage('join_channel')
  handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    if (data?.channelId) {
      client.join(`channel:${data.channelId}`);
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    if (data?.channelId) {
      client.leave(`channel:${data.channelId}`);
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; username: string },
  ) {
    if (data?.channelId) {
      client.to(`channel:${data.channelId}`).emit('typing:start', {
        channelId: data.channelId,
        userId: client.data.userId,
        username: data.username,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    if (data?.channelId) {
      client.to(`channel:${data.channelId}`).emit('typing:stop', {
        channelId: data.channelId,
        userId: client.data.userId,
      });
    }
  }

  // Helper methods to emit real-time events from services
  emitMessageNew(channelId: string, message: any) {
    this.server.to(`channel:${channelId}`).emit('message:new', message);
    this.server.emit('channel:activity', { channelId, lastMessage: message });
  }

  emitMessageUpdate(channelId: string, message: any) {
    this.server.to(`channel:${channelId}`).emit('message:update', message);
  }

  emitMessageDelete(channelId: string, messageId: string) {
    this.server.to(`channel:${channelId}`).emit('message:delete', { channelId, messageId });
  }

  emitReactionChange(channelId: string, data: any) {
    this.server.to(`channel:${channelId}`).emit('reaction:change', data);
  }
}
