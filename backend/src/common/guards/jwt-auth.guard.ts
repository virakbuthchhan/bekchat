import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtOrApiTokenAuthGuard extends AuthGuard('jwt') {
  constructor(private prismaService: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiTokenHeader = request.headers['x-api-token'] || request.headers['x-bot-token'];
    const authHeader = request.headers['authorization'];

    // Check if X-API-Token or X-Bot-Token header is provided
    if (apiTokenHeader && typeof apiTokenHeader === 'string') {
      const apiToken = await this.prismaService.apiToken.findUnique({
        where: { token: apiTokenHeader },
        include: { user: true },
      });

      if (apiToken && apiToken.user) {
        // Update lastUsedAt asynchronously
        this.prismaService.apiToken.update({
          where: { id: apiToken.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        request.user = {
          id: apiToken.user.id,
          email: apiToken.user.email,
          username: apiToken.user.username,
          role: apiToken.user.role,
          status: apiToken.user.status,
          isBotToken: true,
        };
        return true;
      }
    }

    // Check if Bearer token is an API token
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const tokenCandidate = authHeader.split(' ')[1];
      const apiToken = await this.prismaService.apiToken.findUnique({
        where: { token: tokenCandidate },
        include: { user: true },
      });

      if (apiToken && apiToken.user) {
        this.prismaService.apiToken.update({
          where: { id: apiToken.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        request.user = {
          id: apiToken.user.id,
          email: apiToken.user.email,
          username: apiToken.user.username,
          role: apiToken.user.role,
          status: apiToken.user.status,
          isBotToken: true,
        };
        return true;
      }
    }

    // Fallback to JWT standard guard
    return super.canActivate(context) as Promise<boolean>;
  }
}
