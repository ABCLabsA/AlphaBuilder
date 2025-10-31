# AlphaBuilder - Solana Hackathon

> 基于 Solana Anchor 程序的链上 Alpha 情报、Quest 聚合器公共物品。

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：AlphaBuilder mono repo（当前目录）
- [ ] Demo 视频（≤ 3 分钟，中文）：计划录制，暂未提供
- [ ] 在线演示链接（如有）：暂无对外可访问环境
- [ ] 合约部署信息（如有）：待完成测试网部署
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：AlphaBuilder
- **一句话介绍**：From Alpha to Builders —— 把「看消息」变成「做贡献并拿到 Solana 链上凭证」。
- 用邮箱登录即可开通基于 Anchor 程序的智能账户，并实时跟踪稳定性与空投机会。
- **目标用户**：希望无痛体验 Solana 智能账户的 Web3 新用户、运营多钱包的项目方、需要情报的量化/空投策略团队。
- **核心问题与动机（Pain Points）**：传统 EVM AA 方案 onboarding 繁琐、成本偏高；Solana 生态缺乏一站式的策略聚合与智能账户治理。
- **解决方案（Solution）**：提供 NestJS + Prisma 的邮箱注册 API、持久化 Solana 钱包元数据、Rust + Anchor 多模块智能账户程序，以及可视化的稳定性/空投看板。

### 2) 架构与实现 (Architecture & Implementation)

- **总览图（可贴图/链接）**：
- <img width="2134" height="1069" alt="Alpha Builder" src="https://github.com/user-attachments/assets/e4e84662-6063-477d-97e8-1f7a080a611a" />

- **关键模块**：
  - 前端：React 19 + Vite + Tailwind CSS，内置 `EmailAuthProvider`、稳定性表格与空投卡片/历史列表，用于展示 Solana 智能账户数据。
  - 后端：NestJS 10、Prisma 5、PostgreSQL，提供 `/auth/signup` / `/auth/login`、JWT 会话、Argon2 密码散列，以及 Solana 钱包地址与加密私钥的存储接口。
  - 链上程序：Rust 1.78 + Anchor 0.30 编写的 Alpha Builder Solana 程序，涵盖 Vault 金库、智能账户、会话密钥与守护者恢复。
  - 其他：Anchor CLI、`solana-program-test` 集成测试、alpha123.uk 稳定性/空投数据源、Docker 化 PostgreSQL。
- **依赖与技术栈**：
  - 前端：React 19、Vite 7、React Router 7、Tailwind CSS 4、Radix UI、viem（正在迁移至 `@solana/web3.js` 客户端）。
  - 后端：NestJS 10、@nestjs/jwt、Prisma 5、PostgreSQL、Argon2、Class-Validator，计划引入 `@solana/web3.js` 事务编码。
  - 链上程序：Rust 1.78、Anchor 0.30、solana-program 1.18、solana-program-test、bytemuck、serde、thiserror。
  - 部署：Solana Devnet / 本地 `solana-test-validator`，自托管 PostgreSQL（Docker 镜像提供）。

### 3) 合约与部署 (Contracts & Deployment)

- **网络**：Solana Devnet（默认），或本地 `solana-test-validator`。
- **核心程序与 PDA**：
  ```
  alpha_builder (Program ID: AlphaBldr11111111111111111111111111111111111)
  VaultConfig / VaultTreasury PDA：管理管理员、运营者与资金池
  WalletState / WalletTreasury PDA：多签阈值钱包，绑定 SessionKeys 与 Guardian 设置
  SessionKey PDA：会话限额、调用次数、过期槽位、允许调用的程序
  GuardianRecovery PDA：守护者投票、冷却期与恢复提案
  ```
- **验证链接（Solana Explorer）**：待 Devnet 部署后补充。
- **最小复现脚本**：
  ```bash
  cd alpha-builder-solana
  anchor build
  anchor test                             # solana-program-test
  anchor deploy --provider.cluster devnet \
    --provider.wallet ~/.config/solana/id.json
  ```

### 4) 运行与复现 (Run & Reproduce)

- **前置要求**：Node.js ≥ 18.17、pnpm、Rust toolchain、Solana CLI (`solana` ≥ 1.18)、Anchor CLI ≥ 0.30、Docker（可选，用于本地 PostgreSQL）、Git。
- **环境变量样例**：

```bash
# alpha-builder-backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/alpha_builder"
JWT_SECRET="replace-me"
JWT_EXPIRES_IN="1h"
CORS_ORIGINS="http://localhost:5173"
PORT=4000

# alpha-builder-frontend/.env
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_PROGRAM_ID=AlphaBldr11111111111111111111111111111111111
VITE_SOLANA_COMMITMENT=processed

# alpha-builder-solana/.env（可选，Anchor 默认读取 CLI 配置）
SOLANA_CLUSTER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=/path/to/id.json
```

- **一键启动（本地示例）**：

```bash
# 可选：拉起 PostgreSQL
docker run --name alpha-builder-db -p 5432:5432 -e POSTGRES_DB=alpha-builder-db -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password postgres:16

# 可选：启动本地 Solana validator
solana-test-validator --reset --quiet &

# Backend
cd alpha-builder-backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm start:dev

# Frontend（新终端）
cd ../alpha-builder-frontend
pnpm install
pnpm dev -- --host

# Solana 程序（按需）
cd ../alpha-builder-solana
anchor build
anchor test
```

- **在线 Demo（如有）**：暂无。
- **账号与测试说明（如需要）**：本地运行后可自行注册邮箱账号，钱包密钥加密结果持久化在数据库与浏览器 `localStorage`。

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：计划录制，暂未提供。
- **关键用例步骤（2-4 个要点）**：
  - 用例 1：用户以邮箱+密码注册，后端创建 Prisma 用户、返回 JWT，并保存 Solana 钱包地址与加密私钥。
  - 用例 2：登录后自动恢复智能账户，展示 Vault/Wallet 状态，支持复制 PDA 与账户地址。
  - 用例 3：主页实时轮询稳定性数据，按颜色分组、可筛选「稳定/一般/不稳定」并展示价差指标。
  - 用例 4：空投卡片与历史列表聚合 alpha123.uk 数据源，按时间排序并结合 Solana 账户信息提供事件细节。

### 6) 可验证边界 (Verifiable Scope)

- **如未完全开源，请在此明确**：
  - 哪些模块可复现/可验证：前端、后端、Solana 程序与数据库 schema 均已开源，可本地跑通。
  - 哪些模块暂不公开及原因：外部数据源 `alpha123.uk` 由第三方维护，仅提供只读接口；Solana RPC 可使用官方 Devnet，也可自建 validator。

### 7) 路线图与影响 (Roadmap & Impact)

- **赛后 1-3 周**：补充演示视频、完成 Solana Devnet 部署与程序 ID 公布、为空投数据提供缓存服务。
- **赛后 1-3 个月**：集成邮箱证明（如 zkEmail）、打通 Vault SPL Token 支持、上线多链兼容与批量会话密钥策略。
- **预期对 Solana 生态的价值**：降低智能账户的使用门槛，强化钱包安全策略管理，提供给运营团队的数据驱动决策支持。

### 8) 团队与联系 (Team & Contacts)

- **团队名**：ABCLabs
- **成员与分工**：
  - Artist 负责产品设计和Deck撰写
  - AQ 负责打通钱包与我的页面，前后端开发
  - Aiden 负责整体架构和前后端开发
- **联系方式（Email/TG/X）**：
  - Artist: nevermorezxt@gmail.com
  - AQ: qinhaojian404@gmail.com
  - Aiden: csiyu100@gmail.com
- **可演示时段（时区）**：待补充

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [ ] 本地可一键运行，关键用例可复现
- [ ] （如有）测试网合约地址与验证链接已提供
- [ ] Demo 视频（≤ 3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [ ] 联系方式与可演示时段已填写
