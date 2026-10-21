import { Controller, Get } from '@nestjs/common';

/** Public liveness check: GET /api/health → { ok: true }. */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true };
  }
}
