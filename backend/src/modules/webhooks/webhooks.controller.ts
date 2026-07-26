import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { SlackIncomingPayloadDto, CreateIncomingWebhookDto, CreateOutgoingWebhookDto } from './dto/webhook.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Webhooks (Incoming & Outgoing)')
@Controller('api/webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  // --- PUBLIC INCOMING ENDPOINT ---

  @Post('incoming/:token')
  @ApiOperation({ summary: 'Incoming Webhook Receiver (Slack-compatible payload format)' })
  async handleIncomingWebhook(
    @Param('token') token: string,
    @Body() payload: SlackIncomingPayloadDto,
  ) {
    return this.webhooksService.handleIncomingWebhook(token, payload);
  }

  // --- MANAGED INCOMING WEBHOOKS ---

  @Post('incoming')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an incoming webhook for a channel' })
  async createIncomingWebhook(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateIncomingWebhookDto,
  ) {
    return this.webhooksService.createIncomingWebhook(userId, dto);
  }

  @Get('incoming')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List incoming webhooks in workspace' })
  async listIncomingWebhooks(@Query('workspaceId') workspaceId: string) {
    return this.webhooksService.listIncomingWebhooks(workspaceId);
  }

  @Post('incoming/:id/regenerate')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate token for an incoming webhook' })
  async regenerateIncomingToken(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhooksService.regenerateIncomingToken(id, userId);
  }

  @Delete('incoming/:id')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke / delete an incoming webhook' })
  async deleteIncomingWebhook(@Param('id') id: string) {
    return this.webhooksService.deleteIncomingWebhook(id);
  }

  // --- OUTGOING WEBHOOKS ---

  @Post('outgoing')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an outgoing webhook for workspace events' })
  async createOutgoingWebhook(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOutgoingWebhookDto,
  ) {
    return this.webhooksService.createOutgoingWebhook(userId, dto);
  }

  @Get('outgoing')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List outgoing webhooks in workspace' })
  async listOutgoingWebhooks(@Query('workspaceId') workspaceId: string) {
    return this.webhooksService.listOutgoingWebhooks(workspaceId);
  }

  @Delete('outgoing/:id')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an outgoing webhook' })
  async deleteOutgoingWebhook(@Param('id') id: string) {
    return this.webhooksService.deleteOutgoingWebhook(id);
  }

  @Get('outgoing/:id/logs')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get delivery logs for an outgoing webhook' })
  async getDeliveryLogs(@Param('id') id: string) {
    return this.webhooksService.getDeliveryLogs(id);
  }

  @Post('outgoing/:id/test')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test ping payload to outgoing webhook target' })
  async testOutgoingWebhook(@Param('id') id: string) {
    return this.webhooksService.testOutgoingWebhook(id);
  }
}
