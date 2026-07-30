# 微信小程序（uni-app）

## 你能先做的

1. 在 `miniprogram/src/manifest.json` 的 `mp-weixin.appid` 填入你的小程序 AppID
2. 复制 `.env.example` 为 `.env`，确认 `VITE_API_BASE_URL` 指向后端 API
3. 安装依赖并编译：

```bash
cd miniprogram
npm install
npm run build:mp-weixin
```

4. 用微信开发者工具打开 `miniprogram/dist/dev/mp-weixin`（开发）或 `miniprogram/dist/build/mp-weixin`（发布构建）

## 后端环境变量（Railway / 日后腾讯云）

在现有变量基础上新增：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 随机长字符串，生产必改 |
| `JWT_EXPIRES_IN` | 默认 `30d` |
| `WECHAT_APP_ID` | 小程序 AppID |
| `WECHAT_APP_SECRET` | 小程序 AppSecret（仅服务端） |
| `AUTH_ALLOW_DEV_LOGIN` | 开发期可 `true`；上线前改 `false` |

## 数据库注意

本次为多用户改造，**不迁移旧菜单数据**。部署后若启动报错，请在 MySQL 清空业务表或新建库（`synchronize: true` 会重建结构）。

## 微信后台

- 开发阶段：开发者工具可勾选「不校验合法域名」
- 正式上线：在小程序后台配置 request 合法域名为你的 API 域名（需 HTTPS）

## 腾讯云（你稍后做）

- 云托管部署 NestJS 后端
- TencentDB MySQL
- 域名解析 + 备案后绑定 API
- 小程序 request 域名改到新 API
- Railway 跑通后可下线
