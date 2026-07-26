# Railway 部署后端（NestJS + MySQL）

## 常见失败原因

截图里 **Build > Build image** 几秒就失败，通常是：

1. **Root Directory 没设成 `backend`**（最常见）  
   Railway 在仓库根目录找 `package.json`，根目录没有 Node 项目 → 构建失败。  
   ⚠️ 不是 Document Root，不是 `/backend`，就是纯文本：`backend`
2. **部署分支是 `main`，但代码还在 PR 分支**  
   当前 `main` 可能只有 README，完整代码在 `cursor/recipe-recommendation-plan-f7fd`。
3. **Builder 选错**  
   仓库已提供 `backend/Dockerfile`，Root Directory 设为 `backend` 后会自动用 Docker 构建（更稳）。

## 修复步骤（按顺序）

### 1. 确认分支

Railway 服务 → **Settings** → **Source** → **Branch**

- 若 PR 还没合并：选 `cursor/recipe-recommendation-plan-f7fd`
- 若已合并：选 `main`

### 2. 设置根目录（必做，90% 失败在这里）

点你的 **daily-recipe 服务卡片** → **Settings** → 往下找到 **Root Directory**

在输入框里**只填**：

```text
backend
```

注意：
- ❌ 不要填 `/backend`
- ❌ 不要填 `backend/`
- ❌ 不要在 Variables 里加 ROOT_DIRECTORY
- ✅ 就在 Settings 的 Root Directory 输入框

点 **Save**，然后 **Redeploy**。

### 3. 构建方式

Root Directory = `backend` 后，Railway 会读到：

- `backend/Dockerfile`（优先，推荐）
- 或 `backend/railway.toml`

一般不用手改 Build Command；若 UI 里能选 **Builder**，选 **Dockerfile**。

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
