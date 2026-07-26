import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Feedback } from './recipes/entities/feedback.entity';
import { Recipe } from './recipes/entities/recipe.entity';
import { PlanItem } from './plans/entities/plan-item.entity';
import { RecommendationHistory } from './plans/entities/recommendation-history.entity';
import { WeekPlan } from './plans/entities/week-plan.entity';
import { UserPreference } from './preferences/entities/user-preference.entity';

function firstConfig(config: ConfigService, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
}

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const host = firstConfig(config, ['DB_HOST', 'MYSQLHOST', 'MYSQL_HOST'], '127.0.0.1');
  const port = Number(
    firstConfig(config, ['DB_PORT', 'MYSQLPORT', 'MYSQL_PORT'], '3306'),
  );
  const username = firstConfig(
    config,
    ['DB_USER', 'MYSQLUSER', 'MYSQL_USER'],
    'root',
  );
  const password = firstConfig(
    config,
    ['DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASSWORD'],
    '',
  );
  const database = firstConfig(
    config,
    ['DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE'],
    'railway',
  );

  return {
    type: 'mysql',
    host,
    port,
    username,
    password,
    database,
    entities: [
      Recipe,
      Feedback,
      WeekPlan,
      PlanItem,
      RecommendationHistory,
      UserPreference,
    ],
    synchronize: true,
    charset: 'utf8mb4',
    connectTimeout: 20000,
    retryAttempts: 10,
    retryDelay: 3000,
    logging: ['error'],
  };
}
