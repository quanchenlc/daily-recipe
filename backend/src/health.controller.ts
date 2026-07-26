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
      version: '2.4.0',
      features: {
        preferencesPatch: true,
        multiDishMeals: true,
      },
      db: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  }
}
