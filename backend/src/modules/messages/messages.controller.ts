import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto, AddReactionDto } from './dto/message.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages & Reactions')
@Controller('api/messages')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message to a channel or thread' })
  async createMessage(@CurrentUser('id') senderId: string, @Body() dto: CreateMessageDto) {
    return this.messagesService.createMessage(senderId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List message history for a channel with pagination' })
  @ApiQuery({ name: 'channelId', required: true })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  async getChannelMessages(
    @Query('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('parentId') parentId?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.messagesService.getChannelMessages(
      channelId,
      isNaN(parsedLimit) ? 50 : parsedLimit,
      cursor,
      parentId,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages in workspace by text query' })
  async searchMessages(
    @Query('workspaceId') workspaceId: string,
    @Query('q') query: string,
  ) {
    return this.messagesService.searchMessages(workspaceId, query);
  }

  @Get('thread/:parentId')
  @ApiOperation({ summary: 'Get parent message and all thread replies' })
  async getThreadReplies(@Param('parentId') parentId: string) {
    return this.messagesService.getThreadReplies(parentId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edit message content' })
  async updateMessage(
    @Param('id') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(messageId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(
    @Param('id') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagesService.deleteMessage(messageId, userId);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add or remove emoji reaction' })
  async toggleReaction(
    @Param('id') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.messagesService.toggleReaction(messageId, userId, dto.emoji);
  }
}
