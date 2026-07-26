import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, CreateApiTokenDto } from './dto/auth.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth & API Tokens')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email & password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('tokens')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new personal API token (bot/webhook key)' })
  async createApiToken(@CurrentUser('id') userId: string, @Body() dto: CreateApiTokenDto) {
    return this.authService.createApiToken(userId, dto);
  }

  @Get('tokens')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user API tokens' })
  async listApiTokens(@CurrentUser('id') userId: string) {
    return this.authService.listApiTokens(userId);
  }

  @Delete('tokens/:id')
  @UseGuards(JwtOrApiTokenAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an API token' })
  async deleteApiToken(@CurrentUser('id') userId: string, @Param('id') tokenId: string) {
    return this.authService.deleteApiToken(userId, tokenId);
  }
}
