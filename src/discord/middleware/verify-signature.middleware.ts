import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as nacl from 'tweetnacl';
import { ConfigService } from '@config/config.service';

@Injectable()
export class VerifySignatureMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-signature-ed25519'] as string;
    const timestamp = req.headers['x-signature-timestamp'] as string;

    if (!signature || !timestamp) {
      throw new UnauthorizedException('Missing signature headers');
    }

    const publicKey = this.configService.discord.publicKey;
    const body = JSON.stringify(req.body);

    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(publicKey, 'hex'),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid request signature');
    }

    next();
  }
}
