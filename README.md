# Alpha Builder

Modular stack that demonstrates a dual-onboarding Account Abstraction experience:

- **Binance shadow wallets** mirror custodial balances while routing new ERC-4337 user operations
  through our smart account.
- **ZK-email native wallets** let users prove mailbox ownership off-chain, mint an AA wallet, and
  operate fully on Ethereum.

The repository is split in three packages:

| Package | Description |
| --- | --- |
| [`alpha-builder-backend/`](./alpha-builder-backend) | NestJS API for onboarding, Binance sync, zk-email verification, and AA wallet deployment |
| [`alpha-builder-ethereum/`](./alpha-builder-ethereum) | Hardhat workspace with the `EmailAAWallet` smart account + factory contracts |
| [`alpha-builder-frontend/`](./alpha-builder-frontend) | React dashboard that drives both onboarding flows |

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install --filter "@alpha-builder/backend"
   pnpm install --filter "@alpha-builder/ethereum"
   pnpm install --filter "alpha-builder-frontend"
   ```

2. **Configure environment**

   Copy `.env.example` files inside each package, fill in RPC URLs, factory/verifier addresses, JWT
   secret, and (optionally) an operator private key for the backend.

3. **Compile contracts**

   ```bash
   cd alpha-builder-ethereum
   pnpm hardhat compile
   ```

4. **Run backend + frontend**

   ```bash
   # in alpha-builder-backend
   pnpm start:dev

   # in alpha-builder-frontend
   pnpm dev
   ```

   The frontend defaults to `http://localhost:5173` and proxies API calls to
   `http://localhost:4000` (configurable via `VITE_API_BASE_URL`).

## Architecture overview

```
┌─────────────────────┐     ┌────────────────────────┐     ┌────────────────────────────┐
│ React Frontend       │     │ NestJS Backend          │     │ Ethereum Layer              │
│  - Flow selection    │───► │  - Binance integration  │───► │ EmailAAFactory (CREATE2)    │
│  - Proof submission  │     │  - ZK-email verifier    │     │ EmailAAWallet (ERC-4337)    │
│  - Result dashboard  │◄───│  - JWT session tokens   │◄───│ ZKEmailVerifier (pluggable) │
└─────────────────────┘     └────────────────────────┘     └────────────────────────────┘
```

- The backend deploys accounts through `EmailAAFactory`. Deterministic salts encode the user
  metadata so identical inputs reproduce the same address.
- `EmailAAWallet` supports three signature modes: owner EOA, zk-email proof, and Binance custodial
  signature. Nullifiers prevent proof reuse for the zk path.
- Binance onboarding uses signed REST calls to fetch balances. The operator key (if configured)
  signs and broadcasts the deployment transaction; otherwise the backend returns the deterministic
  address for the client to complete via a bundler.

## Next steps

- Integrate a production zk-email prover (e.g., `zkemail-kit`) and bundle proof generation in the
  frontend.
- Swap the in-memory user store for a persistent adapter (Postgres, Dynamo).
- Wire an ERC-4337 bundler or paymaster to automate user operation submission after onboarding.
