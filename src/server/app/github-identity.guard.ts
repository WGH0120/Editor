import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { InjectableBase } from '../injectable-base';
import { OctokitService } from '../octokit/octokit.service';

@Injectable()
export class GithubIdentityGuard extends InjectableBase implements CanActivate {
    constructor(private readonly octokit: OctokitService) {
        super();
    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const request = http.getRequest<FastifyRequest>();
        let token = request.headers['authorization'] ?? (request.query as Record<string, string>)['access_token'];
        if (!token) return true;
        if (typeof token != 'string') throw new UnauthorizedException('Invalid token.');
        token = token.trim();
        if (/^bearer\s+/i.test(token)) token = token.slice(6).trimLeft();
        if (token.length < 8) throw new UnauthorizedException('Invalid token.');
        try {
            const user = await this.octokit.user(token);
            Object.defineProperty(request, 'user', {
                value: user,
                enumerable: true,
                writable: false,
            });
            return true;
        } catch {
            throw new UnauthorizedException('Bad token.');
        }
    }
}
