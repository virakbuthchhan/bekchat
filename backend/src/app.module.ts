import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WebSocketsModule } from './modules/websockets/websockets.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BotModule } from './modules/bot/bot.module';
import { TranslationsModule } from './modules/translations/translations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ChannelsModule,
    MessagesModule,
    WebSocketsModule,
    WebhooksModule,
    BotModule,
    TranslationsModule,
    NotificationsModule,
    UploadModule,
  ],
})
export class AppModule {}
