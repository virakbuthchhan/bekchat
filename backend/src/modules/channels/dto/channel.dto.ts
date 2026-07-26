import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty({ example: 'workspace-id' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ example: 'announcements' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Company-wide announcements', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ enum: ChannelType, example: ChannelType.PUBLIC, required: false })
  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}

export class CreateDirectMessageDto {
  @ApiProperty({ example: 'workspace-id' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ example: 'target-user-id' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}
