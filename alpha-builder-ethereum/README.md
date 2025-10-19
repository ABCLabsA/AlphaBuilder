# Alpha Builder – Ethereum Layer

This package contains the ERC-4337 smart account implementation that powers
the dual onboarding flows (Binance shadow users vs. native zk-email users).

## Contracts

- `EmailAAWallet.sol` – Smart account with three signature pathways:
  owner EOA/1271 signatures, zk-email proofs, and Binance shadow wallet signatures.
- `EmailAAFactory.sol` – CREATE2 factory that derives deterministic addresses from
  user metadata and deploys `EmailAAWallet` instances.
- `mock/ZKEmailVerifierMock.sol` – Lightweight verifier mock useful for local tests.

## Tooling

The project is configured with Hardhat + TypeScript. Install dependencies with

```bash
pnpm install
```

and compile with

```bash
pnpm hardhat compile
```

Create a `.env` file to provide RPC endpoints and keys when deploying:

```
CHAIN_ID=1
SEPOLIA_RPC_URL=https://...
MAINNET_RPC_URL=https://...
DEPLOYER_KEY=0xabc...
```

## Deterministic deployments

`EmailAAFactory.createAccount` hashes the caller provided metadata to derive a salt,
so the same tuple `(owner, kind, binanceWallet, emailCommitment, verifier, salt)` will
always lead to the same address. Recreating a wallet with the same parameters will
return the existing instance instead of redeploying.
