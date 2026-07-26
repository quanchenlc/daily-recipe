# Railway 部署后端（NestJS + MySQL）

## 常见失败原因

截图里 **Build > Build image** 几秒就失败，通常是：

1. **Root Directory 没设成 `backend`**（最常见）  
   Railway 在仓库根目录找 `package.json`，根目录没有 Node 项目 → 构建失败。
2. **部署分支是 `main`，但代码还在 PR 分支**  
   当前 `main` 可能只有 README，完整代码在 `cursor/recipe-recommendation-plan-f7fd`。

## 修复步骤（按顺序）

### 1. 确认分支

Railway 服务 → **Settings** → **Source** → **Branch**

- 若 PR 还没合并：选 `cursor/recipe-recommendation-plan-f7fd`
- 若已合并：选 `main`

### 2. 设置根目录（必做）

**Settings** → **Root Directory** → 填：

```text
backend
```

保存后会自动重新部署。

### 3. 确认构建命令

**Settings** → **Build**：

| 项 | 值 |
|----|-----|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |

（仓库里已有 `backend/railway.toml`，设好 Root Directory 后会自动读取。）

### 4. 环境变量

**Variables** 里至少要有：

```env
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...

COOLDOWN_DAYS=30
PLAN_DAYS=7

LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=你的Key
LLM_MODEL=deepseek-v4-flash
```

MySQL 可用引用变量：

```env
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
```

### 5. 生成公网域名

**Networking** → **Generate Domain**

### 6. 验证

浏览器打开：

```text
https://你的域名.up.railway.app/api/health
```

应返回 `{"ok":true,...}`

## 若仍失败

点 **View logs**，把 **Build** 阶段最后 20 行发我（可打码密码）。
