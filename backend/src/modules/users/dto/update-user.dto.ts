import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, MinLength } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateProfileDto {
  @ApiProperty({ example: 'alex_dev', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ enum: UserStatus, required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ example: 'currentSecret123', required: false })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newSecret456', required: false })
  @IsOptional()
  @IsString()
  @MinLength(4)
  newPassword?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}
