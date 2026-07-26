import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { SendBotMessageDto } from './dto/bot.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bot API (Telegram-style)')
@Controller('api/bot')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class BotController {
  constructor(private botService: BotService) {}

  @Post('sendMessage')
  @ApiOperation({ summary: 'Send a message to a channel via Bot API' })
  async sendMessage(
    @CurrentUser('id') botUserId: string,
    @Body() dto: SendBotMessageDto,
  ) {
    return this.botService.sendMessage(botUserId, dto);
  }

  @Get('getUpdates')
  @ApiOperation({ summary: 'Get unread chat updates via polling (Telegram-style)' })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getUpdates(
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ) {
    return this.botService.getUpdates(offset, limit);
  }
}
