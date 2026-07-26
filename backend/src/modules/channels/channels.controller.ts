import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { CreateChannelDto, CreateDirectMessageDto } from './dto/channel.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Channels & Direct Messages')
@Controller('api/channels')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new channel (public or private)' })
  async createChannel(@CurrentUser('id') userId: string, @Body() dto: CreateChannelDto) {
    return this.channelsService.createChannel(userId, dto);
  }

  @Post('dm')
  @ApiOperation({ summary: 'Get or create a 1:1 Direct Message channel' })
  async getOrCreateDirectMessage(@CurrentUser('id') userId: string, @Body() dto: CreateDirectMessageDto) {
    return this.channelsService.getOrCreateDirectMessage(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List channels in workspace accessible by user' })
  async getWorkspaceChannels(
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.channelsService.getWorkspaceChannels(workspaceId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and members of a channel' })
  async getChannelDetails(@Param('id') channelId: string, @CurrentUser('id') userId: string) {
    return this.channelsService.getChannelDetails(channelId, userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a public channel' })
  async joinChannel(@Param('id') channelId: string, @CurrentUser('id') userId: string) {
    return this.channelsService.joinChannel(channelId, userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark channel messages as read / update read receipt' })
  async updateReadReceipt(
    @Param('id') channelId: string,
    @CurrentUser('id') userId: string,
    @Body('lastReadMessageId') lastReadMessageId?: string,
  ) {
    return this.channelsService.updateReadReceipt(channelId, userId, lastReadMessageId);
  }
}
