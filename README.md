# daily-recipe

按周推荐午餐 + 晚餐，默认 30 天不重复，模型可自动发明新菜入库，并根据点评记住口味。

## 技术栈

- 后端：NestJS + TypeORM + MySQL
- 前端：Vue 3 + Vite（手机友好周菜单页）
- LLM：OpenAI 兼容协议（可后配 Key）

## 快速开始

### 1) 后端

```bash
# MySQL 先建库 daily_recipe，用户示例 recipe / recipe123
cd backend
cp .env.example .env
npm install
npm run start:dev
```

后端默认：`http://localhost:3000`

### 2) 前端

另开终端：

```bash
cd frontend
npm install
npm run dev
```

浏览器打开：`http://localhost:5173`  
（Vite 已代理 `/api` → 后端 `3000`）

## 页面能做什么

- 一键生成本周午 + 晚菜单
- 某一餐「换一道」
- 点评打分，沉淀口味偏好
- 查看当前偏好摘要

## 手机怎么测（短期）

1. **本机电脑预览**：按上面启动前后端，手机和电脑连同一 Wi‑Fi，用电脑局域网 IP 访问，例如 `http://192.168.x.x:5173`
2. **Cursor 手机端**：在对话里下指令，例如「帮我打开前端流程测一遍生成/换菜/点评」，让 Agent 代跑接口并回报结果
3. **仅测 API**：

```bash
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/plans/generate \
  -H 'Content-Type: application/json' -d '{}'
```

## 手机随时打开（部署）

**GitHub 可以托管前端，不能单独跑 Nest + MySQL。**

推荐组合：

1. **前端** → GitHub Pages（仓库已带 Actions）
2. **后端 + MySQL** → Render / Railway 等

完整步骤见：[docs/DEPLOY.md](./docs/DEPLOY.md)

快速摘要：

1. 把后端部署到公网，拿到例如 `https://your-api.onrender.com`
2. GitHub 仓库 Settings → Pages → Source 选 **GitHub Actions**
3. 添加 Actions Secret：`VITE_API_BASE_URL=https://your-api.onrender.com`
4. 合并到 `main` 后自动发布
5. 手机打开：`https://quanchenlc.github.io/daily-recipe/`

## 配置 LLM

编辑 `backend/.env`：

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=gpt-4o-mini
```

未配置 Key 时使用本地 mock，便于先把流程跑通。

## 文档

完整规划见 [docs/PLAN.md](./docs/PLAN.md)。
