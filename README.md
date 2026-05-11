# 懒人简历

<p align="center">
  面向中文求职场景的 AI 简历优化与制作工具。<br />
  把 <strong>旧简历导入 → 岗位定向优化 → 模板排版 → PDF 导出</strong> 串成一条完整流程。
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%26%20Data-3ecf8e" />
  <img alt="License" src="https://img.shields.io/badge/Status-Private-bb6d3f" />
</p>

![懒人简历界面预览](./screenshot-builder.png)

## 项目亮点

- AI 定向优化：支持结合目标 JD 提炼关键词、优化项目描述和经历表达。
- 一体化工作流：优化结果可以继续带入模板制作页，减少重复录入。
- 本地草稿体验：更接近编辑器式交互，适合多轮修改和快速迭代。
- PDF 导出：完成排版后可直接导出成简历成稿。
- 会员分层：内置免费版、月付版、年付版、买断版的套餐能力。

## 适用场景

- 把旧简历快速改成更适合某个岗位的投递版本
- 实习生、应届生、社招候选人的多版本简历管理
- 根据 JD 做关键词对齐、亮点重写和结构整理
- 需要边优化内容边排版，而不是只换模板

## 功能模块

### 1. AI 简历优化

- 支持粘贴原始简历内容
- 支持上传 PDF 简历做解析
- 支持输入目标岗位和 JD
- 支持分段优化与整体优化

### 2. 简历制作工作台

- 模板化编辑与实时预览
- 多模块内容组织
- 适合继续承接优化结果做排版
- 导出 PDF 成稿

### 3. 账户与升级能力

- 手机号 / 邮箱相关登录注册流程
- 账号套餐状态管理
- 兑换码升级入口
- Supabase 服务端接口支持

## 技术栈

- 前端：Next.js 16、React 19、TypeScript
- UI：Tailwind CSS 4、Base UI、Lucide React
- 后端接口：Next.js Route Handlers
- 数据与认证：Supabase
- AI 接口：OpenAI Compatible API / DeepSeek Compatible API

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example`，创建本地环境文件：

```bash
cp .env.example .env.local
```

至少需要根据你的使用方式补齐以下变量：

| 变量名 | 说明 |
| --- | --- |
| `OPENAI_API_KEY` | AI 接口密钥 |
| `OPENAI_BASE_URL` | 兼容接口地址 |
| `OPENAI_MODEL` | 使用的模型名 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 前端公钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务端密钥 |
| `REDEEM_CODES_JSON` | 服务端兑换码配置，避免把真实兑换码写进前端代码 |

示例：

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=deepseek-v4-flash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
REDEEM_CODES_JSON={"CODE-EXAMPLE":{"plan":"monthly","description":"月付版 (10次/月)"}}
```

### 3. 启动开发环境

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## 项目结构

```text
app/
  api/                  Next.js 服务端接口
  builder/              简历制作页
  features/             简历优化工作台
  pricing/              套餐与兑换页
components/
  templates/            简历模板组件
  *.tsx                 页面级与业务组件
lib/
  auth-client.ts        客户端账户状态
  redeem-codes.server.ts 服务端兑换码校验
  supabase/             Supabase 客户端封装
```

## 部署

仓库中包含：

- `Dockerfile`
- `deploy.sh`

适合用于基于 Docker 的自托管部署流程。部署脚本会：

- 拉取最新代码
- 构建镜像
- 替换旧容器
- 使用 `.env.local` 启动服务

## 安全说明

- 真实兑换码应只通过 `REDEEM_CODES_JSON` 放在服务端环境变量中。
- 不要把生产兑换码提交到 Git 仓库或前端代码中。
- `SUPABASE_SERVICE_ROLE_KEY` 只能用于服务端环境。

## 后续可扩展方向

- 把会员状态与兑换记录完整迁移到服务端
- 增加简历版本历史与回滚能力
- 增加更多模板和导出样式
- 增加岗位匹配评分与投递建议面板
