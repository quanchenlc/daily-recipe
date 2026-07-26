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

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

export function resolveDatabaseConfig(config: ConfigService) {
  const databaseUrl = firstConfig(config, [
    'DATABASE_URL',
    'MYSQL_URL',
    'MYSQL_PUBLIC_URL',
  ]);
  if (databaseUrl) {
    return parseDatabaseUrl(databaseUrl);
  }

  return {
    host: firstConfig(config, ['DB_HOST', 'MYSQLHOST', 'MYSQL_HOST'], ''),
    port: Number(
      firstConfig(config, ['DB_PORT', 'MYSQLPORT', 'MYSQL_PORT'], '3306'),
    ),
    username: firstConfig(
      config,
      ['DB_USER', 'MYSQLUSER', 'MYSQL_USER'],
      'root',
    ),
    password: firstConfig(
      config,
      ['DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASSWORD'],
      '',
    ),
    database: firstConfig(
      config,
      ['DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE'],
      'railway',
    ),
  };
}

export function validateDatabaseEnv() {
  if (!process.env.RAILWAY_ENVIRONMENT) {
    return;
  }

  const config = new ConfigService(process.env);
  const db = resolveDatabaseConfig(config);
  const invalidHost =
    !db.host || db.host === '127.0.0.1' || db.host === 'localhost';

  if (invalidHost) {
    console.error(`
[RAILWAY] 数据库未配置，服务无法启动。

请在「后端服务 → Variables」添加（把 MySQL 换成你的数据库服务名）：

DB_HOST=\${{MySQL.MYSQLHOST}}
DB_PORT=\${{MySQL.MYSQLPORT}}
DB_USER=\${{MySQL.MYSQLUSER}}
DB_PASSWORD=\${{MySQL.MYSQLPASSWORD}}
DB_NAME=\${{MySQL.MYSQLDATABASE}}

或在项目里：MySQL 卡片 → Connect → 连接到后端服务。
`);
    process.exit(1);
  }

  console.log(
    `[RAILWAY] database target: ${db.host}:${db.port}/${db.database} user=${db.username}`,
  );
}

export function createTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  const db = resolveDatabaseConfig(config);

  return {
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
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
    retryAttempts: 5,
    retryDelay: 2000,
    logging: ['error'],
  };
}
