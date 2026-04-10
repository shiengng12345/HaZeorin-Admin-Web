# HaZeorin-Admin-Web

**Languages / 语言:** English + 中文

This repository is the current admin/backoffice web client for HaZeorin.

本仓库是 HaZeorin 当前的 Admin / Backoffice Web 客户端。

---

## 1. Purpose / 仓库定位

**English**

`HaZeorin-Admin-Web` is intended to be a **platform owner / internal admin portal**.

It is not:

- a page inside `HaZeorin-Web`
- a replacement for `HaZeorin-PC`
- a tenant self-service portal

Its long-term role is to host platform-level operational and configuration workflows.

**中文**

`HaZeorin-Admin-Web` 的定位是一个 **platform owner / internal admin portal**。

它不是：

- `HaZeorin-Web` 里的某个页面
- `HaZeorin-PC` 的替代品
- tenant 自助门户

它的长期角色，是承载平台级的运营和配置工作流。

---

## 2. Current Status / 当前状态

**English**

Current status:

- repo established
- git remote configured
- Next.js admin portal scaffolded
- current implemented slices include control-hub routing, approval-flow list/create/detail/binding management, platform reporting with backend-persisted saved views, subscription plan CRUD, and tenant subscription operations
- repo-level Verdaccio proto consumption wired in, with current local parity verified against `@hazeorin/reporting-proto@0.1.10`
- admin login is now guarded by a server-side user allowlist
- `HAZEORIN_ADMIN_USER_IDS` still guards the portal entry itself, while backend admin surfaces can now also be scoped per capability through backend-side env vars
- cookie-backed session refresh now also survives the browser dropping expired access-token cookies, as long as the refresh cookie is still valid
- the repo now also has fixture-backed Playwright browser coverage for `login -> tenant switch -> approval-flow draft/publish/binding management -> reporting saved-view lifecycle` and `plan catalog -> create/update plan -> launch/change/cancel subscription`

This repository now contains a working admin web application built around the existing backend gRPC contracts. The current implemented workflows are the neutral control hub, approval-flow list/create/detail/binding management surfaces, the tenant-scoped reporting workspace with saved-view persistence, the subscription plan catalog, and tenant subscription operations.

Current product-model note:

- the core tenant-side organization model is now explicitly `tenant -> branch -> department -> employee`
- branch master-data CRUD currently lives in `HaZeorin-Web`, not in this admin portal
- `HaZeorin-Admin-Web` should document and respect that model, but it should not pretend branch management has already moved here

**中文**

当前状态是：

- repo 已建立
- git remote 已配置
- 已完成 Next.js admin portal 脚手架
- 当前已落地的纵切包括 control hub 路由、approval-flow list/create/detail/binding 管理面、带后端持久化 saved views 的 platform reporting、subscription plan CRUD 和 tenant subscription operations
- 已接好仓库级 Verdaccio proto 包依赖
- admin 登录现在额外受服务端 user allowlist 保护
- `HAZEORIN_ADMIN_USER_IDS` 仍然负责这个 portal 自己的入口 allowlist，而 backend 侧现在也已经支持按 capability 单独收口 admin 面
- 基于 cookie 的 session refresh 现在也已经能在浏览器先清掉过期 access-token cookie 时继续恢复，不会因为 access cookie 丢失而直接强制登出
- 现在也已经补了基于 fixture 的 Playwright 浏览器 E2E，覆盖 `login -> tenant switch -> approval-flow draft/publish/binding management -> reporting saved-view lifecycle`，以及 `plan catalog -> create/update plan -> launch/change/cancel subscription`

也就是说，这个仓库现在不只是项目边界，而是已经有一套可运行的 admin web 应用，当前第一批页面已经覆盖中性的 control hub、approval-flow list/create/detail/binding 管理面、带 saved-view 持久化的 tenant-scoped reporting workspace、subscription plan 与 tenant subscription 管理。

当前产品模型补充说明：

- tenant 侧组织模型现在已经正式收口成 `tenant -> branch -> department -> employee`
- branch 主数据 CRUD 当前落在 `HaZeorin-Web`，还没有迁到这个 admin portal
- 所以 `HaZeorin-Admin-Web` 目前会遵守这套模型，但不会把 branch 管理误写成已经在这里落地

---

## 3. Target Responsibilities / 目标职责

**English**

The initial responsibilities of this repository are:

- approval flow list / create / detail / binding management
- platform reporting / operational views
- plan catalog and subscription operations
- internal support and diagnostic tools

**中文**

这个仓库的初始职责包括：

- 审批流设计器
- 平台报表与运营视图
- 套餐目录与订阅运营
- 内部支持与诊断工具

---

## 4. Boundary Rules / 边界说明

**English**

This repository should follow these boundary rules:

- it does not host tenant self-service pages
- it does not share routing with `HaZeorin-Web`
- it reuses `HaZeorin-Backend` and `HaZeorin-Proto`
- it follows the current architecture choice: **same backend + different web + separate repo**
- tenant branch / department / employee operational maintenance still belongs primarily to `HaZeorin-Web` unless there is a later explicit platform-admin reason to move it

**中文**

这个仓库应遵守这些边界规则：

- 不承载 tenant self-service 页面
- 不与 `HaZeorin-Web` 混用路由
- 复用 `HaZeorin-Backend` 和 `HaZeorin-Proto`
- 当前架构选择是：**same backend + different web + separate repo**
- tenant 日常 branch / department / employee 维护当前仍然优先属于 `HaZeorin-Web`，除非后续明确有平台级运营理由才迁到这里

---

## 5. Backend Dependencies / 当前已准备好的后端依赖

**English**

The backend surfaces already used or prepared for this admin portal are:

- `auth.v1`
- `approvalflow.v1`
- `subscription.v1`
- `tenant.v1`
- `reporting.v1`

**中文**

当前已经准备好、并且部分已被这个 admin portal 消费的 backend 契约包括：

- `auth.v1`
- `approvalflow.v1`
- `subscription.v1`
- `tenant.v1`
- `reporting.v1`

---

## 6. Known Gaps / 当前未完成项

**English**

The current missing pieces are:

- platform-admin auth
- richer admin modules beyond approval-flow, reporting, plan, and subscription operations

Important honesty notes:

- current access control for approval-flow management now accepts backend admin allowlist users, but broader platform-admin RBAC is still transitional
- current reporting page now exists in the admin portal, but it still reuses the tenant-scoped `reporting.v1` surface instead of a dedicated platform analytics contract
- current admin portal still reuses tenant-style auth for bootstrap, but entry is now restricted by `HAZEORIN_ADMIN_USER_IDS`
- the plan catalog and tenant subscription operator flows are now also enforced server-side in `HaZeorin-Backend`, not just at the web login boundary
- the admin home route is now neutral so capability-split operators do not have to land on `/subscriptions` by default
- branch master-data management is not yet an admin workflow here; the canonical tenant-facing branch pages currently live in `HaZeorin-Web`

**中文**

当前还没完成的部分包括：

- platform-admin auth
- approval-flow、reporting、plan、subscription operations 之外的更多管理模块

需要诚实说明的是：

- 当前 approval-flow 管理权限现在已经接受 backend admin allowlist 用户，但更完整的 platform-admin RBAC 仍然是过渡实现
- 当前 reporting 页面已经接进 admin portal，但底层仍然是 tenant-scoped 的 `reporting.v1`，还不是独立的 platform analytics 契约
- 当前 admin portal 仍是复用 tenant 风格 auth 做 bootstrap，但入口已经通过 `HAZEORIN_ADMIN_USER_IDS` 收口为 admin-only allowlist
- plan catalog 与 tenant subscription 这两组 operator 流程现在也已经在 `HaZeorin-Backend` 做了服务端 allowlist 收口，不再只是 Web 登录边界保护
- admin 首页现在已经改成中性的 control hub，避免 capability 拆分后的 operator 一登录就默认落到 `/subscriptions`
- branch 主数据管理当前还不是这个 admin portal 的 workflow；tenant-facing 的 branch 页面目前仍然在 `HaZeorin-Web`

---

## Shared Roadmap / 共用路线图

**English**

The current repo-wide push toward a core-product `80%` milestone is tracked in
[`../coreProduct80PercentRoadmap.md`](../coreProduct80PercentRoadmap.md).

For `HaZeorin-Admin-Web`, the most relevant roadmap slices are:

- internal admin-only boundary hardening
- additional platform operational pages
- support / diagnostic tooling

**中文**

当前整套产品冲刺核心版 `80%` 的共享路线图见
[`../coreProduct80PercentRoadmap.md`](../coreProduct80PercentRoadmap.md)。

对 `HaZeorin-Admin-Web` 最相关的路线图条目是：

- internal admin-only 边界继续收紧
- 补更多平台运营页面
- 补支持 / 诊断工具

---

## 7. Near-Term Pages / 近期页面范围

**English**

The pages already implemented today are:

- Login
- Approval-flow list
- Approval-flow create form
- Approval-flow detail / draft / binding page
- Plan datatable
- Create plan form
- Read/update plan form
- Reporting workspace
- Reporting saved-view save / rename / delete
- Subscription operations page

The next pages should be:

- Builder canvas
- Version history / validation / simulation
- platform overview / tenant diagnostics

**中文**

当前已经落地的页面包括：

- Login
- Approval-flow list
- Approval-flow create form
- Approval-flow detail / draft / binding page
- Plan datatable
- Create plan form
- Read/update plan form
- Reporting workspace
- Reporting saved-view 保存 / 重命名 / 删除
- Subscription operations page

接下来更适合继续补的页面包括：

- Builder canvas
- Version history / validation / simulation
- platform overview / tenant diagnostics

---

## 8. Current Web Slice / 当前已落地的 Web 纵切

**English**

The current admin portal is built with:

- Next.js App Router + TypeScript
- Node runtime BFF
- server-side gRPC calls using `@grpc/grpc-js`
- proto resolution that can use configured root, sibling `HaZeorin-Proto/proto`, or installed repo packages

The current implemented admin slices are:

- neutral control hub route
- approval-flow list / create / detail / binding management
- tenant-scoped reporting workspace
- reporting saved-view list / save / rename / delete backed by `reporting.v1`
- datatable with backend-backed pagination
- search
- filter by `isActive` and `interval`
- sorting
- create plan
- get/update plan
- delete plan with confirmation
- tenant subscription pagination
- create subscription
- change plan
- cancel subscription

**中文**

当前 admin portal 使用的是：

- Next.js App Router + TypeScript
- Node runtime BFF
- 基于 `@grpc/grpc-js` 的服务端 gRPC 调用
- 可以按 configured root、sibling `HaZeorin-Proto/proto`、或已安装仓库包解析的 proto 依赖
- `approvalflow`、`reporting`、`auth`、`subscription`、`tenant` 现在都要求在这个 repo 里有显式直接依赖，不能只靠 sibling fallback 假装可运行
- `npm run proto:check:installed` 现在会直接校验已安装 proto 包，确保这个 admin repo 在没有 sibling proto 仓库时也能独立启动

当前已经落地的管理面纵切包括：

- 中性的 control hub 首页
- approval-flow list / create / detail / binding management
- tenant-scoped reporting workspace
- 基于 `reporting.v1` 的 reporting saved-view 列表 / 保存 / 重命名 / 删除
- 接后端分页的 datatable
- 搜索
- `isActive` / `interval` 筛选
- 排序
- create plan
- get/update plan
- delete plan（二次确认）
- tenant subscription pagination
- create subscription
- change plan
- cancel subscription

---

## 9. Environment / 环境变量

**English**

Current server-side environment variables:

```bash
HAZEORIN_BACKEND_GRPC_ADDR=127.0.0.1:50051
HAZEORIN_ADMIN_USER_IDS=admin-user-id-1,admin-user-id-2
```

`HAZEORIN_ADMIN_USER_IDS` is required for real admin access to this web app. The login flow rejects users whose `userId` is not present in the allowlist, and the session layer keeps the `hz_admin_user_id` cookie so page loads and refreshes can re-check portal access. Separately, the backend can now scope platform-admin capabilities with `HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS`, `HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS`, and `HAZEORIN_ADMIN_REPORTING_USER_IDS`, while `HAZEORIN_ADMIN_USER_IDS` remains the backend fallback allowlist.

**中文**

当前服务端环境变量：

```bash
HAZEORIN_BACKEND_GRPC_ADDR=127.0.0.1:50051
HAZEORIN_BACKEND_GRPC_TRANSPORT=insecure
HAZEORIN_BACKEND_GRPC_CA_CERT_PATH=
HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME=
HAZEORIN_ADMIN_USER_IDS=admin-user-id-1,admin-user-id-2
```

`HAZEORIN_ADMIN_USER_IDS` 是这个 web app 自己的 admin-only 入口配置。现在登录阶段会拒绝不在 allowlist 里的 `userId`，session 层也会额外保存 `hz_admin_user_id` cookie，在页面访问和 refresh 时持续复检 portal 访问权限。与此同时，backend 侧现在也已经支持通过 `HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS`、`HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS`、`HAZEORIN_ADMIN_REPORTING_USER_IDS` 按 capability 单独收口平台管理能力，而 `HAZEORIN_ADMIN_USER_IDS` 仍然是 backend 的 fallback allowlist。

当前传输规则：

- `HAZEORIN_BACKEND_GRPC_TRANSPORT=insecure` 只允许 `127.0.0.1`、`localhost`、`::1` 这类 loopback / local sidecar 地址
- 如果 backend gRPC 地址是远程地址，必须改成 `HAZEORIN_BACKEND_GRPC_TRANSPORT=tls`
- `HAZEORIN_BACKEND_GRPC_CA_CERT_PATH` 可选，用于自定义 CA bundle
- `HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME` 可选，用于 TLS authority / server-name override

Current test coverage:

- `npm test` covers session / transport smoke checks plus fixture-state regression tests
- `npm run proto:check` and `npm run proto:check:installed` are the explicit proto contract verification paths
- `npm run test:e2e` runs fixture-backed admin browser flows for approval-flow management plus plan/subscription operations
- `npm run test:e2e` now also covers admin reporting saved-view save / rename / delete flows
- from the workspace root, `../scripts/install-fe-playwright-browsers.sh`, `../scripts/test-fe-e2e.sh`, and `../scripts/check-fe-ui.sh` can operate both current FE web repos together

当前测试覆盖：

- `npm test` 负责 session / transport smoke checks，以及 fixture 状态回归测试
- `npm run proto:check` 和 `npm run proto:check:installed` 才是显式的 proto 契约校验入口
- `npm run test:e2e` 现在会跑基于 fixture 的 admin 浏览器流程，覆盖 approval-flow management，以及 plan catalog / subscription operations
- `npm run test:e2e` 现在也已经覆盖 admin reporting saved-view 的保存 / 重命名 / 删除流程
- 如果想从 workspace 根目录统一驱动两个 Web 前端，可以直接用 `../scripts/install-fe-playwright-browsers.sh`、`../scripts/test-fe-e2e.sh` 和 `../scripts/check-fe-ui.sh`
