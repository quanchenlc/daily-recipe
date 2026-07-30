import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  check() {
    return {
      ok: true,
      service: 'daily-recipe-api',
      version: '3.0.0',
      features: {
        wechatAuth: true,
        multiUser: true,
        preferencesPatch: true,
        multiDishMeals: true,
      },
      db: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  }
}
