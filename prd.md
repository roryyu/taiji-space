# 太极空间 · 会员课程管理系统 — 系统详细设计（PRD）

> 版本：v1.0 ｜ 面向角色：管理员 ｜ 形态：Web toB 管理后台

---

## 1. 项目概述

「太极空间」是一套面向太极/健身场馆的会员课程管理系统，为管理员提供会员全生命周期管理、会员卡资产管理、课程创建/排期/预约/评价、教师管理、运营数据分析与系统配置能力。

### 1.1 用户角色

| 角色 | 说明 |
| --- | --- |
| 管理员（ADMIN） | 系统唯一登录角色，拥有全部功能权限 |

### 1.2 技术栈

| 层 | 技术 |
| --- | --- |
| 前端框架 | Nuxt 4（Vue 3.5 + vue-router 5，SSR 关闭、SPA 管理后台模式） |
| UI 组件库 | Element Plus 2.14（@element-plus/nuxt 模块自动按需引入） |
| 认证 | @sidebase/nuxt-auth（local provider）+ jsonwebtoken（JWT 签发/校验）+ bcryptjs（密码哈希） |
| ORM / 数据库 | Prisma 7（@prisma/client + @prisma/adapter-pg 驱动适配器）+ PostgreSQL（pg） |
| 参数校验 | zod 4（服务端 API 入参统一校验） |
| 扩展能力 | ali-oss（对象存储预留）、sharp（图片压缩预留）、tesseract.js（图片 OCR 批量导入预留）、openai / marked（AI 运营摘要预留） |

### 1.3 架构说明

```
浏览器 (Element Plus SPA)
   │  $fetch /api/**（携带 JWT Bearer Token）
   ▼
Nuxt Nitro Server（server/api/**）
   │  zod 校验入参 → 业务逻辑
   ▼
Prisma Client（@prisma/adapter-pg 连接池单例）
   ▼
PostgreSQL
```

- **认证链路**：登录 `POST /api/auth/login` → bcrypt 校验密码 → jsonwebtoken 签发 JWT → nuxt-auth local provider 存储 token 并在后续请求自动携带 `Authorization: Bearer` → 服务端中间件统一校验，将用户信息挂载到 `event.context.auth`。
- **连接池**：Prisma Client 通过 `server/utils/prisma.ts` 全局单例持有（开发态挂载 `globalThis` 防止 HMR 重复实例化导致连接泄漏）。
- **鉴权范围**：除 `/api/auth/login` 外，全部 `/api/**` 接口需要有效 JWT。

---

## 2. 数据模型设计

### 2.1 ER 总览

```
Store 1─n Member          Store 1─n Course
Teacher 1─n Member(教练)   Teacher 1─n Course
Member 1─n MembershipCard  MembershipCard 1─n CardTransaction
Course 1─n CourseSchedule  CourseSchedule 1─n Booking
Member 1─n Booking         Member 1─n CourseReview
Course 1─n CourseReview
AdminUser（独立）           SystemParam（独立，key-value）
```

### 2.2 表结构

#### AdminUser 管理员

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | 自增主键 |
| username | String unique | 登录名 |
| password | String | bcrypt 哈希 |
| name | String | 显示昵称 |
| createdAt / updatedAt | DateTime | 时间戳 |

#### Store 店铺（系统配置-店铺）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| name | String | 店铺名称 |
| address | String | 地址 |
| businessHours | String | 经营时段（如 09:00-21:00） |

#### Teacher 教师

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| name | String | 姓名 |
| qualification | String | 资质 |
| styleTags | String[] | 风格标签 |
| status | Enum(ACTIVE/INACTIVE) | 在职状态 |

#### Member 会员信息

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| name | String | 顾客姓名 |
| category | Enum(NORMAL/VIP/SVIP) | 顾客分类 |
| phone | String unique | 手机号 |
| storeId | FK → Store | 门店名称 |
| channel | Enum(WALK_IN/REFERRAL/ONLINE/ACTIVITY/OTHER) | 获客渠道 |
| coachId | FK → Teacher（可空） | 教练 |
| preferenceTags | String[] | 标签-课程偏好 |
| remark | String? | 标签-备注 |

#### MembershipCard 会员卡

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| cardNo | String unique | 卡号（TJ + 时间戳自动生成） |
| type | Enum(COUNT/PERIOD/STORED) | 会员卡类型：次卡/期限卡/储值卡 |
| memberId | FK → Member | 归属会员 |
| balance | Decimal | 余额（储值卡金额 / 次卡剩余次数） |
| validFrom / validTo | DateTime | 有效期 |
| status | Enum(ACTIVE/FROZEN/EXPIRED) | 状态 |

#### CardTransaction 卡流水

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| cardId | FK → MembershipCard | |
| type | Enum(RECHARGE/DEDUCT/FREEZE/UNFREEZE/EXTEND) | 充值/扣减/冻结/解冻/延期 |
| amount | Decimal | 变动金额（冻结类为 0） |
| remark | String? | 备注 |

#### Course 课程

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| name | String | 课程名称 |
| storeId | FK → Store | 课程店铺 |
| teacherId | FK → Teacher | 教师 |
| capacity | Int | 容纳人数 |
| description | String? | 课程描述 |

#### CourseSchedule 课程排期

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| courseId | FK → Course | |
| stage | Enum(BASIC/INTERMEDIATE/ADVANCED) | 课程阶段：基础/进阶/高级 |
| startTime / endTime | DateTime | 课程时段 |
| status | Enum(OPEN/FINISHED/CANCELLED) | 排期状态 |

#### Booking 课程预约

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| memberId | FK → Member | 会员 |
| scheduleId | FK → CourseSchedule | 排期（含课程阶段、课程时间） |
| status | Enum(BOOKED/CANCELLED/COMPLETED) | 预约状态 |
| 唯一约束 | (memberId, scheduleId) | 防止重复预约 |

#### CourseReview 课程评价

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | Int PK | |
| memberId | FK → Member | 会员 |
| courseId | FK → Course | 课程 |
| rating | Int (1-5) | 评分 |
| suggestion | String? | 建议 |

#### SystemParam 系统参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| key | String PK | 参数键 |
| value | String | 参数值 |
| description | String? | 说明 |

---

## 3. 功能模块设计

### 3.1 登录认证

- 登录页 `/login`：用户名 + 密码；错误提示；登录后跳转仪表盘。
- 未登录访问任意页面 → nuxt-auth 全局中间件重定向 `/login`。
- JWT 有效期 7 天，密钥来自环境变量 `JWT_SECRET`。

### 3.2 会员管理

#### 3.2.1 会员信息（/members）

- **功能**：新增、编辑、删除、分页查询（填删改查）、**批量导入**。
- **查询条件**：姓名/手机号关键字、顾客分类、门店、获客渠道。
- **字段**：顾客姓名、顾客分类、手机号、门店名称、获客渠道、教练、标签（课程偏好多选 + 备注）。
- **批量导入**：粘贴/上传 CSV 文本（姓名,手机号,分类,渠道），服务端逐行 zod 校验，返回成功/失败明细；手机号重复跳过。
- **删除**：存在有效会员卡或未取消预约时禁止删除（服务端校验）。

#### 3.2.2 会员卡（/cards）

- **功能**：开卡、**充值**、**冻结**、**解冻**、**有效期管理（延期）**，全部操作落 CardTransaction 流水。
- **字段**：卡号（自动生成）、会员卡类型（次卡/期限卡/储值卡）、有效期、状态（正常/冻结/过期）。
- **规则**：
  - 充值：仅 ACTIVE 卡可充值，金额 > 0，事务内更新余额 + 写流水。
  - 冻结/解冻：状态机 ACTIVE ↔ FROZEN；过期卡不可解冻为正常。
  - 有效期管理：延长 validTo，写 EXTEND 流水；查询时超期卡展示为过期。

### 3.3 课程管理

#### 3.3.1 课程创建（/courses）

- **功能**：添删改查。
- **字段**：课程名称、课程店铺、教师、容纳人数、课程描述。
- **删除**：存在未完成排期时禁止删除。

#### 3.3.2 课程排期（/schedules）

- **功能**：填删改查。
- **字段**：所属课程、课程阶段（基础/进阶/高级）、课程时段（开始~结束时间）、状态。
- **规则**：结束时间必须晚于开始时间；同教师时间冲突提示（服务端校验同课程教师重叠排期）。

#### 3.3.3 课程预约（/bookings）

- **功能**：查看、预约、取消。
- **字段**：会员、课程阶段（随排期带出）、课程时间（随排期带出）、状态。
- **规则**：
  - 预约：排期需 OPEN 且未满员（BOOKED 数 < 课程容量）；同会员同排期不可重复预约；事务 + 行级校验防超卖。
  - 取消：仅 BOOKED 状态可取消。

#### 3.3.4 课程评价（/reviews）

- **功能**：录入、查看、删除。
- **字段**：会员、课程、评分（1-5 星）、建议。

### 3.4 教师管理（/teachers）

- **功能**：填删改查（教师列表）。
- **字段**：姓名、资质、风格标签（多标签）。
- **删除**：教师名下存在课程时禁止删除。

### 3.5 运营分析（/analytics，总览卡片位于工作台 /）

| 维度 | 指标 | 计算口径 |
| --- | --- | --- |
| 会员 | 上课频次 | 每会员 COMPLETED 预约数 Top 榜 |
| 会员 | 标签 | 课程偏好标签出现频次分布 |
| 教师 | 课程完成率 | 该教师排期中 FINISHED / 总排期（剔除 CANCELLED） |
| 教师 | 学员评价统计 | 名下课程评价均分与评价数 |
| 课程 | 课程报名人数统计 | 每课程有效预约（非 CANCELLED）总人数 |

- 附核心总览卡片（工作台 / 展示）：会员总数、活跃会员卡数、课程数、今日排期数、待上课预约数。
- 所有统计由服务端 SQL/groupBy 聚合完成，避免全量数据拉到前端计算。

### 3.6 系统配置

#### 3.6.1 店铺（/settings · 店铺管理 Tab）

- **功能**：填删改查。
- **字段**：名称、地址、经营时段。
- **删除**：店铺下存在会员或课程时禁止删除。

#### 3.6.2 系统参数（/settings · 系统参数 Tab）

- **功能**：key-value 参数维护（新增/编辑/删除）。
- 预置参数：`booking.cancel.deadline.hours`（预约取消提前小时数）、`card.expire.remind.days`（会员卡到期提醒天数）、`site.name`（系统名称）。

---

## 4. API 设计

统一约定：

- 前缀 `/api`；除 `/api/auth/login` 外全部需要 `Authorization: Bearer <JWT>`。
- 成功返回业务数据；失败 `createError({ statusCode, message })`，前端统一拦截弹出 ElMessage。
- 列表接口统一支持 `page`、`pageSize`，返回 `{ items, total }`。

| 模块 | 方法与路径 | 说明 |
| --- | --- | --- |
| 认证 | POST /api/auth/login | 登录，返回 `{ token }` |
| | POST /api/auth/logout | 登出 |
| | GET /api/auth/session | 获取当前用户 |
| 会员 | GET/POST /api/members | 分页查询 / 新增 |
| | PUT/DELETE /api/members/:id | 编辑 / 删除 |
| | POST /api/members/import | CSV 批量导入 |
| 会员卡 | GET/POST /api/cards | 分页查询 / 开卡 |
| | POST /api/cards/:id/recharge | 充值 |
| | POST /api/cards/:id/freeze | 冻结 |
| | POST /api/cards/:id/unfreeze | 解冻 |
| | POST /api/cards/:id/extend | 有效期延长 |
| | GET /api/cards/:id/transactions | 卡流水 |
| 课程 | GET/POST /api/courses、PUT/DELETE /api/courses/:id | 课程 CRUD |
| 排期 | GET/POST /api/schedules、PUT/DELETE /api/schedules/:id | 排期 CRUD |
| 预约 | GET/POST /api/bookings | 查看 / 预约 |
| | POST /api/bookings/:id/cancel | 取消预约 |
| | POST /api/bookings/:id/complete | 完成核销 |
| 评价 | GET/POST /api/reviews、DELETE /api/reviews/:id | 评价管理 |
| 教师 | GET/POST /api/teachers、PUT/DELETE /api/teachers/:id | 教师 CRUD |
| 分析 | GET /api/analytics/overview | 总览卡片 |
| | GET /api/analytics/members | 会员维度 |
| | GET /api/analytics/teachers | 教师维度 |
| | GET /api/analytics/courses | 课程维度 |
| 店铺 | GET/POST /api/stores、PUT/DELETE /api/stores/:id | 店铺 CRUD |
| 参数 | GET/POST /api/params、DELETE /api/params/:key | 系统参数 |
| 基础 | GET /api/options | 下拉选项（店铺/教师/会员/课程精简列表） |

---

## 5. 页面设计（toB 管理后台）

### 5.1 布局

- 经典 toB 三段式：左侧深色可折叠菜单（Logo + 图标菜单）、顶部栏（面包屑 + 用户下拉/退出）、内容区卡片化。
- Element Plus 组件规范：列表 `el-table` + `el-pagination`，表单弹窗 `el-dialog` + `el-form`（规则校验），筛选区 `el-form inline`，操作确认 `ElMessageBox.confirm`。

### 5.2 菜单结构

```
🏠 工作台           /            （核心指标总览卡片）
👥 会员信息         /members
💳 会员卡           /cards
📚 课程管理         /courses
📅 课程排期         /schedules
📝 课程预约         /bookings
⭐ 课程评价         /reviews
🧑‍🏫 教师管理         /teachers
📊 运营分析         /analytics   （会员/教师/课程三 Tab）
⚙️ 系统配置         /settings    （店铺管理 + 系统参数 Tab）
🔐 登录             /login       （空白布局）
```

---

## 6. 非功能设计

- **安全**：密码 bcrypt(10) 哈希存储；JWT 服务端中间件统一校验；所有写接口 zod 严格校验；Prisma 参数化查询防注入。
- **性能**：列表全部服务端分页；统计走数据库聚合（groupBy/count/avg）；Prisma + pg 连接池复用单例。
- **内存**：Prisma Client/pg Pool 全局单例，避免 dev HMR 与请求级重复创建；批量导入按行流式处理并限制单次 1000 行。
- **一致性**：充值/预约等资金与库存操作使用 `prisma.$transaction` 保证原子性。
- **可维护**：API 按模块目录组织；共享类型 `shared/types.ts`；常量枚举中文映射集中管理。

---

## 7. 交付清单（验收标准）

- [x] Nuxt4 + Element Plus + Prisma7(PG adapter) 框架初始化，可 `npm run dev` 启动
- [x] 登录/登出/会话保持（nuxt-auth local + JWT + bcrypt）
- [x] 会员信息：增删改查 + 批量导入，字段齐全（姓名/分类/手机号/门店/渠道/教练/偏好标签/备注）
- [x] 会员卡：开卡/充值/冻结/解冻/有效期延长 + 流水，字段齐全（卡号/类型/有效期/状态）
- [x] 课程创建：添删改查（名称/店铺/教师/容纳人数/描述）
- [x] 课程排期：填删改查（阶段/时段），教师时间冲突校验
- [x] 课程预约：查看/预约/取消（会员/阶段/时间），容量与重复预约校验
- [x] 课程评价：会员/评分/建议
- [x] 教师管理：填删改查（姓名/资质/风格标签）
- [x] 运营分析：会员上课频次与标签、教师课程完成率与评价统计、课程报名人数统计
- [x] 系统配置：店铺（名称/地址/经营时段）、系统参数
- [x] 种子数据：初始管理员 admin（密码取环境变量 `SEED_ADMIN_PASSWORD`，未设置则随机生成并仅打印一次）及演示数据
- [x] README.md：安装、配置、启动、目录结构说明
