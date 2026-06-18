# 小晴的AI影视妙妙屋

一个本地运行的 AI 视频制作无限画布桌面应用。它把剧本、分镜、图片、视频、角色、声音、导出等创作步骤拆成节点，并允许用户接入自己的外部 API 模型。

## 功能

- 无限画布节点工作流
- 剧本、图像、视频三类独立 API 配置
- 外部模型同步与接口调试
- 素材库、角色库、提示词模板、时间线与导出
- 支持本地文件拖入画布自动生成节点
- Electron 桌面安装包
- GitHub Releases 自动更新

## 本地开发

```bash
npm install
npm run db:init
npm run dev
```

打开 `http://localhost:3000`。

## 桌面打包

```bash
npm run build
npx electron-builder --win nsis --publish never
```

产物在 `release/` 目录：

- `xiaoqing-ai-video-house-setup-版本号.exe`
- `xiaoqing-ai-video-house-setup-版本号.exe.blockmap`
- `latest.yml`

## GitHub 自动更新发布

1. 在 GitHub 创建仓库，例如 `xiaoqing-ai-video-house`。
2. 把 `package.json` 里的 `YOUR_GITHUB_USERNAME` 替换成你的 GitHub 用户名或组织名。
3. 每次发布前升级 `package.json` 的 `version`，例如 `0.1.0` 改为 `0.1.1`。
4. 设置 GitHub token：

```bash
set GH_TOKEN=你的 GitHub token
```

5. 发布到 GitHub Releases：

```bash
npm run desktop:release:github
```

用户安装后的桌面版会读取 GitHub Release 里的 `latest.yml`，检测新版本并下载更新。

## 安全说明

- `.env`、`prisma/dev.db`、`release/`、`.next/`、`node_modules/` 不会提交到 GitHub。
- 安装包内只包含空模板数据库 `prisma/app-template.db`。
- 用户自己的 API Key 和项目数据保存在本机用户目录，不会进入源码仓库。
