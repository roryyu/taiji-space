# 太极空间 · 会员课程管理系统

面向太极/健身场馆的 Web toB 管理后台，提供会员全生命周期管理、会员卡资产管理、课程创建/排期/预约/评价、员工管理、运营数据分析与系统配置能力。

> 详细系统设计见 [prd.md](./prd.md)

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Nuxt 4（Vue 3.5 + vue-router 5，SPA 管理后台模式） |
| UI | Element Plus 2.14（@element-plus/nuxt 自动按需引入） |
| 认证 | @sidebase/nuxt-auth（local provider）+ jsonwebtoken + bcryptjs |
| ORM | Prisma 7（@prisma/client + @prisma/adapter-pg 驱动适配器） |
| 数据库 | PostgreSQL（pg 连接池） |
| 校验 | zod 4（服务端 API 入参统一校验） |

## 环境要求

- **Node.js v26.4.0**（推荐通过 nvm 管理：`nvm use v26.4.0`）
- PostgreSQL 14+（本地或远程实例）

## 快速开始

### 1. 安装依赖

```bash
nvm use v26.4.0
npm install
```

`postinstall` 会自动执行 `nuxt prepare` 生成 `.nuxt` 类型。

### 2. 配置环境变量

复制并按需修改 `.env`：

```env
# PostgreSQL 连接串，?schema= 指定业务 schema（CLI 与运行时均已适配）
DATABASE_URL="postgresql://user:password@localhost:5432/postgres?schema=taiji"
# JWT 签名密钥（生产环境务必更换为强随机值）
JWT_SECRET="your-secret-key"
```

### 3. 初始化数据库

开发环境（直接同步表结构，不生成迁移文件）：

```bash
npm run db:generate   # 生成 Prisma Client（输出到 generated/prisma）
npm run db:push       # 同步表结构到数据库（仅限开发环境）
npm run db:seed       # 写入种子数据（管理员账号 + 演示数据）
```

生产环境 / 首次部署（必须走迁移，`db:deploy` 依赖迁移文件）：

```bash
# 首次需先在开发环境生成基线迁移并提交到仓库：
npx prisma migrate dev --name init
git add prisma/migrations && git commit -m "chore(db): add baseline migration"

# 部署代码到服务器后，在服务器上执行：
npm run db:generate   # 生成 Prisma Client
npm run db:deploy     # 应用迁移，创建/更新表结构
npm run db:seed       # 写入种子数据（生产环境默认跳过演示数据）
```

### 4. 启动开发服务

```bash
npm run dev
```

访问 http://localhost:3000 ，使用员工账号登录。

首次初始化时 seed 会创建账号为 `admin` 的管理员（type: ADMINISTRATOR）：密码由环境变量 `SEED_ADMIN_PASSWORD` 指定；未设置时随机生成，并仅在 seed 的控制台输出中打印一次，请注意记录并妥善保管。上线后请立即修改密码。

### 5. 其他脚本

```bash
npm run typecheck     # vue-tsc 全量类型检查
npm run build         # 生产构建
npm run preview       # 预览生产构建
npm run start         # 启动生产服务（需先 npm run build）
npm run db:migrate    # 开发环境：根据 schema 变更生成并应用迁移
npm run db:deploy     # 生产环境：仅应用已提交的迁移
```

## 上线前检查清单

- 生产环境必须配置高强度随机 `JWT_SECRET`（≥32 位，可用 `openssl rand -base64 32` 生成）与强数据库口令，不得复用本地 `.env`；
- 数据库变更一律走迁移：开发环境执行 `npm run db:migrate` 生成 migration 并将 `prisma/migrations` 目录提交仓库；生产环境只使用 `npm run db:deploy` 应用迁移，严禁执行 `prisma migrate dev` / `npm run db:push`；
- 生产环境不要初始化演示数据：`db:seed` 在 `NODE_ENV=production` 下自动跳过演示数据，如确需初始化可设置 `SEED_DEMO=1` 强制执行；
- 首次登录后立即修改密码（seed 打印的初始密码仅输出一次）。

## 功能模块

| 菜单 | 路由 | 说明 |
| --- | --- | --- |
| 工作台 | `/` | 核心指标总览（会员数/活跃卡/课程/今日排期/待上课预约） |
| 会员信息 | `/members` | 增删改查 + CSV 批量导入（姓名/手机号/获客渠道/偏好标签/备注） |
| 会员卡 | `/cards` | 开卡/编辑/有效期延长，关联门店/课程/员工，全部操作落流水 |
| 课程管理 | `/courses` | 课程 CRUD（名称/描述） |
| 课程排期 | `/schedules` | 排期 CRUD（阶段/时段） |
| 课程预约 | `/bookings` | 预约/取消/完成核销，重复预约校验 |
| 课程评价 | `/reviews` | 评价录入/删除（会员/课程/1-5 星/建议） |
| 员工管理 | `/staffs` | 员工 CRUD（姓名/资质/风格标签/账号/密码/类型：教练/经理/管理员） |
| 运营分析 | `/analytics` | 会员标签分布、员工统计、课程报名统计 |
| 系统配置 | `/settings` | 店铺管理（名称/地址/经营时段/店长）+ 系统参数（key-value） |

## 目录结构

```
taiji-space/
├── app/
│   ├── app.vue                 # 根组件（NuxtLayout + NuxtPage）
│   ├── composables/useApi.ts   # 统一请求封装（自动携带 JWT、401 跳转、错误提示）
│   ├── layouts/
│   │   ├── default.vue         # toB 三段式布局（深色侧栏 + 顶栏 + 内容区）
│   │   └── blank.vue           # 空白布局（登录页）
│   └── pages/                  # 业务页面（见上方功能模块表）
├── server/
│   ├── api/                    # Nitro API（按模块目录组织，zod 校验入参）
│   ├── middleware/             # JWT 统一鉴权中间件
│   └── utils/prisma.ts         # Prisma Client 全局单例（防 HMR 连接泄漏）
├── shared/                     # 前后端共享类型与枚举中文映射
├── prisma/
│   ├── schema.prisma           # 数据模型（10 张表）
│   ├── seed.ts                 # 种子数据（管理员账号 + 演示数据）
│   └── migrations/             # 数据库迁移文件
├── prisma.config.ts            # Prisma 7 CLI 配置（datasource.url + seed 命令）
├── nuxt.config.ts              # Nuxt 配置（Element Plus、nuxt-auth local provider）
└── prd.md                      # 系统详细设计文档
```

## 关键设计说明

- **认证链路**：登录 → Staff 表 account/bcrypt 校验 → JWT 签发（7 天有效，包含 id/username/name/type）→ nuxt-auth 存储 token 并自动携带 `Authorization: Bearer` → 服务端中间件统一校验（除 `/api/auth/login` 外全部接口需鉴权）。
- **菜单权限控制**：基于 Staff 表 `type` 字段实现菜单级权限控制，JWT token 中包含用户角色信息，前端根据角色动态过滤菜单项，无权限页面自动重定向到默认首页。
- **Prisma 7 适配**：schema 不再声明 `url`，CLI 连接由 `prisma.config.ts` 的 `datasource.url` 提供；运行时通过 `@prisma/adapter-pg` 连接，URL 中的 `?schema=` 参数被解析后显式传给 `PrismaPg`。
- **性能**：列表全部服务端分页；统计走数据库聚合（groupBy/count/avg 并行）；分析页三 Tab 懒加载。
- **内存**：Prisma Client/pg Pool 全局单例挂载 `globalThis`，避免 dev HMR 重复实例化导致连接泄漏；批量导入单次限 1000 行。
- **一致性**：预约等库存操作使用 `prisma.$transaction` + 行级校验保证原子性。

## 本次重构记录

### 数据模型变更

| 变更项 | 说明 |
| --- | --- |
| 删除 `AdminUser` 表 | 登录认证统一使用 Staff 表 |
| 删除 `Teacher` 表 | 新建 `Staff` 员工表替代 |
| 新建 `Staff` 表 | 字段：id/name/qualification(可选)/styleTags/account(唯一)/password( bcrypt)/type(TEACHER/MANAGER/ADMINISTRATOR) |
| `Member` 表 | 移除 storeId/coachId/category 字段 |
| `MembershipCard` 表 | 移除 type/balance/status；新增 storeId/courseId/coachId 关联 + totalAmount/totalSessions/giftSessions 整数字段 |
| `MembershipCard` 表 | 新增 staffId 字段（关联 Staff），记录负责员工（MANAGER/ADMINISTRATOR） |
| `Course` 表 | 移除 storeId/teacherId/capacity 字段 |

### 登录逻辑变更

- 原：`AdminUser` 表 username/password 认证
- 现：`Staff` 表 account/password 认证（bcrypt 加密，防暴力破解锁定机制保留）

### 菜单权限控制（2026-08-14）

#### 角色权限矩阵

| 角色 | 可见菜单 |
| --- | --- |
| TEACHER（教练） | 课程排期、课程预约 |
| MANAGER（经理） | 工作台、会员信息、会员卡、课程管理、课程排期、课程预约、课程评价、运营分析 |
| ADMINISTRATOR（管理员） | 所有菜单 |

#### 实现方案

**后端变更：**

| 文件 | 变更说明 |
| --- | --- |
| `server/utils/auth.ts` | AuthPayload 接口新增 `type` 字段（TEACHER/MANAGER/ADMINISTRATOR） |
| `server/api/auth/login.post.ts` | JWT 签发时包含 `user.type` |
| `server/api/auth/session.get.ts` | session 接口返回 `type` 字段 |
| `nuxt.config.ts` | session dataType 配置新增 `type: 'string'` |

**前端变更：**

| 文件 | 变更说明 |
| --- | --- |
| `app/layouts/default.vue` | 菜单配置增加 `roles` 字段；根据用户角色动态过滤菜单；无权限页面自动重定向到默认首页 |
| `app/pages/login.vue` | 登录成功后根据角色跳转到对应默认首页（TEACHER → /schedules，其他 → /） |

#### 技术细节

- JWT token 采用 HS256 算法签名，payload 包含 `{id, username, name, type}`
- 前端通过 `useAuth()` composable 获取 session 数据，`session.value.type` 为当前用户角色
- 菜单过滤逻辑：`allMenus.filter(menu => menu.roles.includes(userRole))`
- 权限守卫：监听 `session.type` 和 `route.path`，无权限时自动重定向

### 路由变更

| 原路由 | 新路由 | 说明 |
| --- | --- | --- |
| `/teachers` | `/staffs` | 教师管理 → 员工管理 |

### 会员卡 staffId 功能（2026-08-14）

#### 数据模型变更

- `MembershipCard` 表新增 `staffId` 字段（可选，关联 Staff 表）
- 用于记录负责员工（MANAGER 或 ADMINISTRATOR 创建时保存对应的 staffId）

#### API 变更

| 接口 | 变更说明 |
| --- | --- |
| `POST /api/cards` | 开卡时自动保存 staffId：ADMINISTRATOR 需手动选择 MANAGER 作为负责员工；MANAGER 自动使用当前登录用户 id |
| `GET /api/cards` | 列表查询根据角色过滤：MANAGER 只能查看自己创建的数据；ADMINISTRATOR 可查看所有数据；返回 creator 信息 |
| `PUT /api/cards/:id` | 编辑权限控制：ADMINISTRATOR 可编辑所有会员卡（含修改负责员工）；MANAGER 只能编辑自己创建的数据 |
| `GET /api/options` | 门店选项新增返回 staffId（店长），用于自动填充负责员工 |

#### 前端变更

| 变更项 | 说明 |
| --- | --- |
| 会员卡列表 | 新增"创建人"列；"员工"列改为"授课教师"列；移除"延期"和"流水"操作按钮；编辑按钮根据角色权限显示 |
| 开卡表单 | "员工"改为"授课教师"（仅显示 TEACHER 类型）；ADMINISTRATOR 可见"负责员工"下拉框（仅显示 MANAGER 类型）；选择门店时自动填充店长到负责员工 |
| 编辑表单 | 同开卡表单变更；ADMINISTRATOR 可修改负责员工 |
| 权限控制 | ADMINISTRATOR 可编辑所有会员卡；MANAGER 只能编辑自己创建的会员卡 |

#### 数据库迁移

```bash
npx prisma migrate dev --name add_membershipcard_staffid
```

### 店铺店长功能（2026-08-14）

#### 数据模型变更

- `Store` 表新增 `staffId` 字段（可选，关联 Staff 表）
- 用于指定店铺的店长（MANAGER 类型员工）
- Staff 表新增 `stores` 反向关系

#### API 变更

| 接口 | 变更说明 |
| --- | --- |
| `GET /api/stores` | 列表查询返回 manager 信息（id/name） |
| `POST /api/stores` | 新增时支持 staffId 参数 |
| `PUT /api/stores/:id` | 编辑时支持 staffId 参数（null 可清除店长） |

#### 前端变更

| 变更项 | 说明 |
| --- | --- |
| 店铺列表 | 新增"店长"列显示 |
| 店铺表单 | 新增店长下拉选择（仅显示 MANAGER 类型员工） |

#### 数据库迁移

```bash
npx prisma migrate dev --name add_store_staffid
```

## License

仅供学习与内部使用。
