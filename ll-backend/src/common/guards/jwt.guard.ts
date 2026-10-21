import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid bearer token; sets `req.user` to the SessionAdmin (see JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
