import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TranslationsService } from './translations.service';
import {
  CreateTranslationPackDto,
  VoteTranslationPackDto,
  CreateProposalDto,
  VoteProposalDto,
} from './dto/translation.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Multi-Language & Community Translations')
@Controller('api/translations')
export class TranslationsController {
  constructor(private translationsService: TranslationsService) {}

  @Get('packs')
  @ApiOperation({ summary: 'List available language packs with community votes & scores' })
  async listPacks(@CurrentUser('id') userId?: string) {
    return this.translationsService.listPacks(userId);
  }

  @Get('packs/:code')
  @ApiOperation({ summary: 'Fetch full translation dictionary for a language code (e.g. en, km)' })
  async getPackDictionary(@Param('code') code: string) {
    return this.translationsService.getPackDictionary(code);
  }

  @Get('packs/:code/keys')
  @ApiOperation({ summary: 'Fetch all translation keys and community proposals for a target language' })
  async getKeyProposals(@Param('code') code: string, @CurrentUser('id') userId?: string) {
    return this.translationsService.getKeyProposals(code, userId);
  }

  @Post('packs')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Contribute a new community language pack' })
  async createPack(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTranslationPackDto,
  ) {
    return this.translationsService.createPack(userId, dto);
  }

  @Post('packs/:id/vote')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote (+1) or Downvote (-1) a community language pack' })
  async votePack(
    @CurrentUser('id') userId: string,
    @Param('id') packId: string,
    @Body() dto: VoteTranslationPackDto,
  ) {
    return this.translationsService.votePack(userId, packId, dto);
  }

  @Post('keys/:keyId/proposals')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a new translation proposal value for a specific key' })
  async submitProposal(
    @CurrentUser('id') userId: string,
    @Param('keyId') keyId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.translationsService.submitProposal(userId, keyId, dto);
  }

  @Post('proposals/:proposalId/vote')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote (+1) or Downvote (-1) a specific translation proposal' })
  async voteProposal(
    @CurrentUser('id') userId: string,
    @Param('proposalId') proposalId: string,
    @Body() dto: VoteProposalDto,
  ) {
    return this.translationsService.voteProposal(userId, proposalId, dto);
  }
}
