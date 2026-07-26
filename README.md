# daily-recipe

按周推荐午餐 + 晚餐，默认 30 天不重复，模型可自动发明新菜入库，并根据点评记住口味。

## 技术栈

- 后端：**NestJS + TypeORM + MySQL**（当前已实现 API）
- 前端：**Vue**（稍后，先 API）
- LLM：OpenAI 兼容协议（可后配 Key）

## 快速开始

```bash
# 1) 准备 MySQL 库（示例）
# CREATE DATABASE daily_recipe CHARACTER SET utf8mb4;
# CREATE USER 'recipe'@'%' IDENTIFIED BY 'recipe123';
# GRANT ALL ON daily_recipe.* TO 'recipe'@'%';

cd backend
cp .env.example .env
npm install
npm run start:dev
```

健康检查：`GET http://localhost:3000/api/health`

## 核心 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/plans/generate` | 生成一周午晚餐 |
| GET | `/api/plans/current` | 查看当前周 |
| POST | `/api/plans/:id/items/:itemId/reroll` | 换一道 |
| POST | `/api/recipes/:id/feedback` | 点评 |
| GET | `/api/preferences` | 偏好 |
| GET | `/api/recipes` | 菜谱库（模型会自动写入） |

生成示例：

```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## 配置 LLM

编辑 `backend/.env`：

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o-mini
```

未配置 Key 时使用本地 mock，便于先把流程跑通。

## 文档

完整规划与决策见 [docs/PLAN.md](./docs/PLAN.md)。
