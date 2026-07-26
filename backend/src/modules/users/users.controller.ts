import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateStatusDto } from './dto/update-user.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users & Profiles')
@Controller('api/users')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update profile (username, avatar)' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('status')
  @ApiOperation({ summary: 'Update online presence status (ONLINE, AWAY, OFFLINE)' })
  async updateStatus(@CurrentUser('id') userId: string, @Body() dto: UpdateStatusDto) {
    return this.usersService.updateStatus(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  async listUsers() {
    return this.usersService.listUsers();
  }
}
