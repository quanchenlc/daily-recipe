import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'daily-recipe-api',
      time: new Date().toISOString(),
    };
  }
}
