import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from '../websockets/chat.gateway';
import { SlackIncomingPayloadDto, CreateIncomingWebhookDto, CreateOutgoingWebhookDto } from './dto/webhook.dto';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  // --- INCOMING WEBHOOKS ---

  async createIncomingWebhook(userId: string, dto: CreateIncomingWebhookDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const token = `whi_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.incomingWebhook.create({
      data: {
        channelId: dto.channelId,
        name: dto.name,
        token,
        createdById: userId,
      },
      include: {
        channel: { select: { id: true, name: true } },
      },
    });
  }

  async listIncomingWebhooks(workspaceId: string) {
    return this.prisma.incomingWebhook.findMany({
      where: {
        channel: { workspaceId },
      },
      include: {
        channel: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async regenerateIncomingToken(id: string, userId: string) {
    const webhook = await this.prisma.incomingWebhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException('Incoming webhook not found');
    }

    const newToken = `whi_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.incomingWebhook.update({
      where: { id },
      data: { token: newToken },
    });
  }

  async deleteIncomingWebhook(id: string) {
    return this.prisma.incomingWebhook.delete({
      where: { id },
    });
  }

  async handleIncomingWebhook(token: string, payload: SlackIncomingPayloadDto) {
    // Basic in-memory rate limiting: 30 requests / 60 seconds per token
    const now = Date.now();
    const rateData = this.rateLimitMap.get(token) || { count: 0, resetAt: now + 60000 };

    if (now > rateData.resetAt) {
      rateData.count = 0;
      rateData.resetAt = now + 60000;
    }

    rateData.count++;
    this.rateLimitMap.set(token, rateData);

    if (rateData.count > 30) {
      throw new BadRequestException('Rate limit exceeded for webhook token (max 30 req/min)');
    }

    const webhook = await this.prisma.incomingWebhook.findUnique({
      where: { token },
      include: {
        channel: true,
      },
    });

    if (!webhook || !webhook.isActive) {
      throw new NotFoundException('Invalid or inactive incoming webhook token');
    }

    const botUsername = payload.username || webhook.name || 'Webhook Bot';
    const avatarUrl = payload.icon_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(botUsername);

    // Format content (if Slack attachments exist, append formatted text)
    let content = payload.text || '';
    if (payload.attachments && Array.isArray(payload.attachments)) {
      for (const att of payload.attachments) {
        if (att.title) content += `\n**${att.title}**`;
        if (att.text) content += `\n${att.text}`;
      }
    }

    // Find or create virtual Bot User for sender
    let botUser = await this.prisma.user.findFirst({
      where: { username: `bot_${botUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}` },
    });

    if (!botUser) {
      const email = `bot_${crypto.randomBytes(4).toString('hex')}@webhook.local`;
      botUser = await this.prisma.user.create({
        data: {
          email,
          username: `bot_${botUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          passwordHash: 'BOT_ACCOUNT_NO_LOGIN',
          avatarUrl,
          role: 'MEMBER',
          status: 'ONLINE',
        },
      });
    }

    // Create message in DB
    const message = await this.prisma.message.create({
      data: {
        channelId: webhook.channelId,
        senderId: botUser.id,
        content,
        formatting: 'markdown',
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        attachments: true,
        reactions: true,
      },
    });

    // Broadcast via WebSocket
    this.chatGateway.emitMessageNew(webhook.channelId, message);

    // Trigger Outgoing Webhooks
    this.dispatchOutgoingEvent(webhook.channel.workspaceId, 'message.created', {
      event: 'message.created',
      channelId: webhook.channelId,
      message,
    }).catch(() => {});

    return { ok: true, messageId: message.id };
  }

  // --- OUTGOING WEBHOOKS ---

  async createOutgoingWebhook(userId: string, dto: CreateOutgoingWebhookDto) {
    const secret = dto.secret || `whs_${crypto.randomBytes(24).toString('hex')}`;

    return this.prisma.outgoingWebhook.create({
      data: {
        workspaceId: dto.workspaceId,
        channelId: dto.channelId || null,
        name: dto.name,
        targetUrl: dto.targetUrl,
        secret,
        events: dto.events,
      },
    });
  }

  async listOutgoingWebhooks(workspaceId: string) {
    return this.prisma.outgoingWebhook.findMany({
      where: { workspaceId },
      include: {
        channel: { select: { id: true, name: true } },
        _count: { select: { deliveryLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteOutgoingWebhook(id: string) {
    return this.prisma.outgoingWebhook.delete({
      where: { id },
    });
  }

  async getDeliveryLogs(outgoingWebhookId: string) {
    return this.prisma.webhookDeliveryLog.findMany({
      where: { outgoingWebhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async testOutgoingWebhook(id: string) {
    const webhook = await this.prisma.outgoingWebhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      throw new NotFoundException('Outgoing webhook not found');
    }

    const testPayload = {
      event: 'ping.test',
      timestamp: new Date().toISOString(),
      message: 'This is a test ping from Bek-Chat outgoing webhook system.',
    };

    return this.deliverSinglePayload(webhook, 'ping.test', testPayload);
  }

  async dispatchOutgoingEvent(workspaceId: string, event: string, payload: any) {
    const webhooks = await this.prisma.outgoingWebhook.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    const matchingWebhooks = webhooks.filter((wh) => {
      const eventsList = wh.events as string[];
      if (!Array.isArray(eventsList)) return false;
      const isSubscribed = eventsList.includes(event) || eventsList.includes('*');
      if (!isSubscribed) return false;
      if (wh.channelId && payload.channelId && wh.channelId !== payload.channelId) return false;
      return true;
    });

    for (const wh of matchingWebhooks) {
      this.deliverPayloadWithRetry(wh, event, payload).catch((err) => {
        console.error(`[OutgoingWebhook] Final delivery failure for ${wh.id}:`, err.message);
      });
    }
  }

  private async deliverPayloadWithRetry(webhook: any, event: string, payload: any) {
    const maxRetries = 3;
    const delays = [1000, 3000, 9000]; // Exponential backoff delays in ms

    let lastError: any = null;
    let statusCode: number | null = null;
    let responseBody: string | null = null;

    // Create log record
    const log = await this.prisma.webhookDeliveryLog.create({
      data: {
        outgoingWebhookId: webhook.id,
        event,
        payload,
        status: 'RETRYING',
        attemptCount: 1,
      },
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const bodyString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(bodyString)
          .digest('hex');

        const res = await axios.post(webhook.targetUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-BekChat-Event': event,
            'User-Agent': 'BekChat-WebhookDispatcher/1.0',
          },
          timeout: 5000,
        });

        statusCode = res.status;
        responseBody = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        await this.prisma.webhookDeliveryLog.update({
          where: { id: log.id },
          data: {
            statusCode,
            responseBody: responseBody.substring(0, 1000),
            attemptCount: attempt,
            status: 'SUCCESS',
          },
        });
        return;
      } catch (err: any) {
        lastError = err;
        statusCode = err.response?.status || null;
        responseBody = err.response?.data
          ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
          : err.message;

        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delays[attempt - 1]));
        }
      }
    }

    // Mark as FAILED after retries exhausted
    await this.prisma.webhookDeliveryLog.update({
      where: { id: log.id },
      data: {
        statusCode,
        responseBody: responseBody?.substring(0, 1000) || lastError?.message,
        attemptCount: maxRetries,
        status: 'FAILED',
      },
    });
  }

  private async deliverSinglePayload(webhook: any, event: string, payload: any) {
    const bodyString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(bodyString)
      .digest('hex');

    try {
      const res = await axios.post(webhook.targetUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-BekChat-Event': event,
          'User-Agent': 'BekChat-WebhookDispatcher/1.0',
        },
        timeout: 5000,
      });

      const log = await this.prisma.webhookDeliveryLog.create({
        data: {
          outgoingWebhookId: webhook.id,
          event,
          payload,
          statusCode: res.status,
          responseBody: JSON.stringify(res.data).substring(0, 1000),
          attemptCount: 1,
          status: 'SUCCESS',
        },
      });

      return { success: true, statusCode: res.status, response: res.data, logId: log.id };
    } catch (err: any) {
      const statusCode = err.response?.status || null;
      const responseBody = err.response?.data ? JSON.stringify(err.response.data) : err.message;

      const log = await this.prisma.webhookDeliveryLog.create({
        data: {
          outgoingWebhookId: webhook.id,
          event,
          payload,
          statusCode,
          responseBody: responseBody.substring(0, 1000),
          attemptCount: 1,
          status: 'FAILED',
        },
      });

      return { success: false, statusCode, error: err.message, responseBody, logId: log.id };
    }
  }
}
