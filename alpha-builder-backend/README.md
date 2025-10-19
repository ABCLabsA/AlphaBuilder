# Alpha Builder – Backend API

NestJS service that orchestrates the two onboarding flows:

- Binance custodial users → mirror balances and expose an ERC-4337 smart account
  that can execute on Ethereum while tracking the custodial wallet.
- Native users → zk-email login backed by the zk verifier + AA wallet deployment.

## Key modules

- `AuthModule` bundles both onboarding paths.
  - `POST /auth/zk-email/init` – issues session metadata and commitments.
  - `POST /auth/zk-email/verify` – verifies zk proof, deploys wallet, returns JWT.
  - `POST /auth/binance/onboard` – syncs Binance balances, deploys shadow wallet.
- `UsersModule` – Prisma-powered persistence layer for AA wallet profiles.
- `EthereumModule` – Hardhat/ethers adapter that talks to the factory/verifier contracts.
- `BinanceModule` – Axios-based client for Binance REST (signs requests with API keys).

## Environment

Copy `.env.example` into `.env` and configure:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alpha-builder-db?schema=public
ETHEREUM_RPC_URL=...
EMAIL_AA_FACTORY_ADDRESS=0x...
ZK_EMAIL_VERIFIER_ADDRESS=0x...
ETHEREUM_OPERATOR_KEY=0x...
JWT_SECRET=change-me
BINANCE_API_URL=https://api.binance.com
```

The operator key is optional; without it the service falls back to returning deterministic
addresses so clients can submit user ops directly via a bundler.

## Scripts

```bash
pnpm install
pnpm prisma:generate # emit Prisma client
pnpm prisma:migrate  # create/update schema (requires running database)
pnpm start:dev       # watch mode
pnpm build && pnpm start # production build
```

Tests use Jest (`pnpm test`) once unit suites are added.

## Database & Prisma

The repository includes a Dockerfile for a local PostgreSQL instance:

```bash
# from repo root
docker build -f Dockerfile.postgres -t alpha-builder-db .
docker run --name alpha-builder-db -p 5432:5432 alpha-builder-db
```

Once the container is running, update `DATABASE_URL` if needed, then run `pnpm prisma:migrate`
to apply schema changes. The `UsersService` now persists AA wallet metadata, so restarting the
backend will preserve onboarded users.
