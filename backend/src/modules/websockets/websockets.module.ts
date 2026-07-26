import { Global, Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod',
    }),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class WebSocketsModule {}
