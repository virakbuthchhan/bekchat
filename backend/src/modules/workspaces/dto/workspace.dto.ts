import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}

export class UpdateWorkspaceDto {
  @ApiProperty({ example: 'Acme Global', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsString()
  iconUrl?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'alex_dev or alex@example.com' })
  @IsString()
  @IsNotEmpty()
  emailOrUsername: string;

  @ApiProperty({ enum: MemberRole, default: MemberRole.MEMBER, required: false })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: MemberRole })
  @IsEnum(MemberRole)
  role: MemberRole;
}
