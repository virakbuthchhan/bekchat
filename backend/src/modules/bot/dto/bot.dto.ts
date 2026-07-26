import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendBotMessageDto {
  @ApiProperty({ example: 'channel-id' })
  @IsString()
  @IsNotEmpty()
  channel_id: string;

  @ApiProperty({ example: 'Hello from Bek-Chat Bot!' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'markdown', required: false })
  @IsOptional()
  @IsString()
  formatting?: string;

  @ApiProperty({ example: 'parent-message-id', required: false })
  @IsOptional()
  @IsString()
  reply_to_message_id?: string;
}

export class GetBotUpdatesDto {
  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  offset?: number;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  limit?: number;
}
