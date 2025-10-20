# Alpha Builder Ethereum Layer

This package contains the smart-contract layer used by the Alpha Builder stack. It introduces an `AlphaVault` contract that escrows ETH on behalf of each account abstraction wallet created through ZeroDev. Deposits and withdrawals emit events which the backend indexes before coordinating smart-wallet user operations.

## Stack

- **Hardhat + TypeScript** for compilation, testing, and deployment
- **AlphaVault.sol** – minimal treasury contract with admin/operator roles
- Deployments target the same ZeroDev RPC configured for the existing AA wallets

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

Populate `.env` from `.env.example` with the ZeroDev RPC URL, chain id, and the deployer key (a funded account on the chosen testnet). Then deploy:

```bash
pnpm deploy --network zerodev
```

The deployment script prints the contract address; register it in the backend config so the frontend can consume it.

## Contract Overview

- `deposit(address owner)` – payable entry to credit the specified AA wallet
- `withdraw(address owner, address recipient, uint256 amount)` – lets the owner or operators release funds
- `balanceOf(address)` – off-chain read helper for the backend/frontend

Events:

- `Deposit(owner, amount, newBalance)`
- `Withdrawal(owner, recipient, amount, newBalance)`

## Next Steps

- Extend with ERC20 support if required
- Plug in role management (e.g. admin multisig)
- Configure backend cron/watchers to reconcile vault balances with on-chain state
