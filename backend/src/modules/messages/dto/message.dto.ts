import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttachmentDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'https://example.com/uploads/document.pdf' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 102450 })
  fileSize: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;
}

export class CreateMessageDto {
  @ApiProperty({ example: 'channel-id' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ example: 'Hello team! Check this report out.' })
  @IsString()
  @IsNotEmpty()
  content: string;

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
