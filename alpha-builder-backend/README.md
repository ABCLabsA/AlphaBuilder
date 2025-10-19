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
- `UsersModule` – in-memory registry of session users (swap with DB later).
- `EthereumModule` – Hardhat/ethers adapter that talks to the factory/verifier contracts.
- `BinanceModule` – Axios-based client for Binance REST (signs requests with API keys).

## Environment

Copy `.env.example` into `.env` and configure:

```
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
pnpm start:dev # watch mode
pnpm build && pnpm start # production build
```

Tests use Jest (`pnpm test`) once unit suites are added.
