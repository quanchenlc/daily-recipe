import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  check() {
    return {
      ok: true,
      service: 'daily-recipe-api',
      db: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  }
}
