import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, UpdateMemberRoleDto } from './dto/workspace.dto';
import { JwtOrApiTokenAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workspaces')
@Controller('api/workspaces')
@UseGuards(JwtOrApiTokenAuthGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  async createWorkspace(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.createWorkspace(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces joined by current user' })
  async getUserWorkspaces(@CurrentUser('id') userId: string) {
    return this.workspacesService.getUserWorkspaces(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace details and channel list' })
  async getWorkspaceById(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
  ) {
    return this.workspacesService.getWorkspaceById(userId, workspaceId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace name and icon' })
  async updateWorkspace(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.updateWorkspace(userId, workspaceId, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members in workspace' })
  async getWorkspaceMembers(@Param('id') workspaceId: string) {
    return this.workspacesService.getWorkspaceMembers(workspaceId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a member to workspace by email or username' })
  async inviteMember(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspacesService.inviteMember(userId, workspaceId, dto);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update workspace member role' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(userId, workspaceId, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from workspace' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspacesService.removeMember(userId, workspaceId, memberId);
  }
}
