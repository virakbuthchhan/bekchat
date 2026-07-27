import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttachmentDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: '/uploads/document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiProperty({ example: 102450, required: false })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiProperty({ example: 'application/pdf', required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateMessageDto {
  @ApiProperty({ example: 'channel-id' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ example: 'Hello team! Check this report out.', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'markdown', required: false })
  @IsOptional()
  @IsString()
  formatting?: string;

  @ApiProperty({ example: 'parent-message-id-for-thread', required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ type: [CreateAttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentDto)
  attachments?: CreateAttachmentDto[];
}

export class UpdateMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AddReactionDto {
  @ApiProperty({ example: '👍' })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}
