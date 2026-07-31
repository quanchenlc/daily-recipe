# 家常菜谱 · 微信小程序

uni-app（Vue 3）客户端，对接带 JWT 的后端 API。

## 前置条件

- Node.js 18+
- 微信开发者工具
- 后端已部署并配置 `JWT_SECRET`、微信 AppID/Secret（或开发期 `AUTH_ALLOW_DEV_LOGIN=true`）

## 快速开始

```bash
cd miniprogram
cp .env.example .env
# 编辑 .env 中的 VITE_API_BASE_URL
npm install
npm run dev:mp-weixin    # 开发
npm run build:mp-weixin  # 发布构建
```

微信开发者工具导入目录：

- 开发：`dist/dev/mp-weixin`
- 构建：`dist/build/mp-weixin`

## 配置 AppID

编辑 `src/manifest.json` → `mp-weixin.appid`。

## 目录说明

```
src/
  api/client.ts       # API + Token 存储
  composables/        # useAuth 登录
  pages/
    menu/             # 今日菜单
    history/          # 历史确认
    settings/         # 偏好设置
  types.ts            # 与 H5 共用的类型定义
  utils/date.ts       # 日期工具
```

## 登录流程

1. 启动时尝试本地 token → `GET /api/auth/me`
2. 失败则 `wx.login` → `POST /api/auth/wechat/login`
3. 仍失败且服务端开启 dev 登录 → `POST /api/auth/dev/login`

## 相关文档

仓库根目录 `docs/MINIPROGRAM.md` 含 Railway / 腾讯云部署说明。

> 本目录属于小程序专用分支 `cursor/wechat-auth-miniprogram-f7fd`，与 H5 主线分离。
