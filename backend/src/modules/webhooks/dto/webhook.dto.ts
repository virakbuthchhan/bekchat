import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class SlackIncomingPayloadDto {
  @ApiProperty({ example: 'Deploy complete! Version 1.2.0 is live.' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'DeployBot', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: 'https://example.com/bot-icon.png', required: false })
  @IsOptional()
  @IsString()
  icon_url?: string;

  @ApiProperty({ example: 'https://example.com/bot-icon.png', required: false })
  @IsOptional()
  @IsString()
  icon_emoji?: string;

  @ApiProperty({ example: [{ title: 'Build status', text: 'Success' }], required: false })
  @IsOptional()
  @IsArray()
  attachments?: any[];
}

export class CreateIncomingWebhookDto {
  @ApiProperty({ example: 'channel-id' })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({ example: 'GitHub Deployment Alerts' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateOutgoingWebhookDto {
  @ApiProperty({ example: 'workspace-id' })
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ example: 'channel-id', required: false })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ example: 'Production Event Audit' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com/webhooks/receive' })
  @IsUrl()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({ example: ['message.created', 'reaction.added', 'user.joined'] })
  @IsArray()
  events: string[];

  @ApiProperty({ example: 'my-custom-secret', required: false })
  @IsOptional()
  @IsString()
  secret?: string;
}
