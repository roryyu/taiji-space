# AGENTS.md

本文件为 AI 编码代理（Coding Agent）提供 `taiji-space` 项目的上下文与协作约定。

## 项目概览

太极空间 · 会员课程管理系统：面向太极/健身场馆的 Web toB 管理后台，提供会员全生命周期管理、会员卡资产、课程排期/预约/评价、员工管理与运营分析。

详细业务设计见 [prd.md](./prd.md)，功能说明与重构记录见 [README.md](./README.md)。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Nuxt 4（Vue 3 + vue-router，SPA 管理后台模式，`ssr: false`） |
| UI | Element Plus 2.14（`@element-plus/nuxt` 自动按需引入，`importStyle: 'css'`） |
| 认证 | `@sidebase/nuxt-auth`（local provider）+ jsonwebtoken + bcryptjs |
| ORM | Prisma 7（`@prisma/adapter-pg`，schema 由 `prisma.config.ts` 提供连接） |
| 数据库 | PostgreSQL（开发走 `db:push`，生产走迁移 `db:deploy`） |
| 校验 | zod 4（服务端 API 入参统一校验） |

## 常用命令

```bash
npm run dev          # 开发服务（默认 3000 端口，被占用时自动顺延）
npm run typecheck    # vue-tsc 全量类型检查
npm run build        # 生产构建
npm run db:generate  # 生成 Prisma Client（输出到 generated/prisma）
npm run db:push      # 开发环境同步表结构
npm run db:migrate   # 开发环境生成并应用迁移
npm run db:deploy    # 生产环境仅应用已提交迁移
npm run db:seed      # 种子数据（生产默认跳过演示数据）
```

Node.js v26.4.0（nvm 管理）。

## 目录结构

```
app/
├── layouts/default.vue    # 主布局（浅色侧栏 + 顶栏 + 内容区）
├── layouts/blank.vue      # 登录页布局
├── pages/                 # 业务页面（一个模块一个目录）
├── composables/useApi.ts  # 统一请求封装（JWT 携带、401 跳转、错误提示）
└── assets/css/main.css    # 设计令牌 + Element Plus 主题覆盖（见「样式规范」）
server/
├── api/                   # Nitro API，按模块目录组织，zod 校验入参
├── middleware/auth.ts     # JWT 统一鉴权（除 /api/auth/login 外全部鉴权）
└── utils/                 # prisma 单例、auth、validate、date
shared/utils/labels.ts     # 前后端共享的枚举中文映射
prisma/                    # schema / seed / migrations
.agents/skills/            # Agent Skill 资料（见「样式规范」）
```

## 样式规范（重要）

本项目视觉体系参考 **shadcn/ui 设计语言**，但组件库是 Element Plus（Vue），**不要**引入 React 组件或 Tailwind。

1. **先读 `.agents/skills/shadcn/SKILL.md` 与 `rules/styling.md`**，理解语义化色彩、圆角刻度、克制阴影等设计原则；其中 React/Tailwind 专属内容（className、cn()、组件 API）不适用，只取设计语言。
2. **颜色一律走设计令牌**，禁止新增硬编码色值。令牌定义在 `app/assets/css/main.css`：
   - `--ts-primary`（#2563eb 品牌靛蓝）、`--ts-foreground` / `--ts-muted-foreground`（文字）、`--ts-border`（边框）、`--ts-muted`（弱背景）、`--ts-success` / `--ts-warning` / `--ts-danger`（状态色）及对应 `-light` 弱底色
   - 圆角用 `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl`
   - 阴影用 `--ts-shadow-sm` / `--ts-shadow` / `--ts-shadow-lg`
3. **覆盖 Element Plus 主题的注意点**：`@element-plus/nuxt` 按需注入的样式在全局 CSS 之后加载，因此：
   - 覆盖 `:root` 级 `--el-*` 变量必须用 `html:root` 选择器提高优先级；
   - 覆盖组件样式用 `body .el-xxx` 前缀选择器；
   - 优先映射 `--el-*` 变量，其次才是直接重写属性。
4. **页面模式**：列表页统一为 `el-card`（toolbar 筛选栏 + el-table + el-pagination + el-dialog 表单）；表格不加 `border stripe`，靠全局主题的轻分隔线与行 hover 高亮。
5. **状态色语义化**：成功/完成用 `--ts-success`，警告/待处理用 `--ts-warning`，危险/删除用 `--ts-danger`，与 shadcn「不用裸色值表达状态」的原则一致。

## 业务约定

- **角色权限**：Staff 表 `type` 分 `TEACHER` / `MANAGER` / `ADMINISTRATOR`，菜单按角色过滤（`layouts/default.vue` 的 `allMenus.roles`），数据范围过滤在服务端 API 内实现。改动菜单或数据可见性时两边都要同步。
- **认证链路**：登录走 Staff 表 account/bcrypt → JWT（7 天，含 id/username/name/type）→ nuxt-auth 自动携带 Bearer → 服务端中间件统一校验。
- **API 模式**：入参用 zod 校验；列表一律服务端分页（`page` / `pageSize`）；库存类操作（预约/耗课）用 `prisma.$transaction` 保证原子性；已上课排期不可修改/删除。
- **前端请求**：统一走 `useApi().request`，不要裸写 `$fetch`；错误已由 useApi 统一 ElMessage 提示，页面内 `catch {}` 留空即可。
- **枚举文案**：新增枚举值时同步更新 `shared/utils/labels.ts` 的中文映射。
- **数据库变更**：开发环境 `npm run db:migrate` 生成迁移并提交 `prisma/migrations`；生产只允许 `db:deploy`，严禁 `db:push` / `migrate dev`。

## 提交约定

- commit message 使用约定式格式：`feat:` / `fix:` / `refactor:` / `style:` / `chore(db):` 等，描述用中文。
- 样式类改动不触碰业务逻辑；类型检查（`npm run typecheck`）必须不引入新错误（存量错误清单见 README 与提交历史，改动前先比对基线）。

## 安全红线

- 生产环境 `JWT_SECRET` 必须为强随机值（≥32 位），不得复用开发密钥。
- 不在代码或文档中记录任何真实口令、密钥、种子密码。
- 删除类接口必须保留服务端权限校验与二次确认交互。
