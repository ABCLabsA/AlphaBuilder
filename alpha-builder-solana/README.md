# Alpha Builder Solana Layer

This package now delivers the Alpha Builder on-chain layer as a Solana program written in Rust with Anchor. The contract suite contains the following pillars:

- **Vault** – deterministic PDA treasury with administrator/operator roles and per-owner balance tracking.
- **Smart Wallet** – threshold-based multi-owner wallet with optional operator delegation, session key registry, guardian driven recovery, and memoed value transfers.
- **Session Keys** – lightweight capability accounts that bound usage by slot expiry, call counts, program allowlists, and cumulative spend.
- **Guardian Recovery** – timelocked guardian quorum that can rotate owners and thresholds after a cooldown.

The repository is organised as a standard Anchor workspace backed by Rust unit/integration tests via `solana-program-test`.

## Project Layout

- `Anchor.toml` – Anchor configuration (program id, provider, scripts).
- `Cargo.toml` – workspace manifest sharing Solana/Anchor dependencies.
- `programs/alpha_builder/src/lib.rs` – on-chain instruction handlers, events, and helper routines.
- `programs/alpha_builder/src/state.rs` – persistent account structs, sizing helpers, and shared data types.
- `programs/alpha_builder/src/errors.rs` – custom program errors surfaced to clients.
- `tests/program-test` – Rust integration tests built with `solana-program-test` validating vault and wallet/session flows.

## Getting Started

Ensure you have the Solana toolchain, Rust (nightly not required), and Anchor CLI available. Then run:

```bash
cargo fmt
cargo build-bpf
```

To execute the program tests (uses `solana-program-test`):

```bash
cargo test -p alpha_builder-program-test
```

> **Note:** the first build/test run downloads Anchor and Solana crates from crates.io. Make sure outbound network access is enabled for Cargo.

## Program Overview

### Vault Flow

- `init_vault` – initialises the vault config PDA and treasury PDA keyed by the admin signer.
- `set_vault_operator` – updates the optional operator delegate allowed to withdraw on behalf of owners.
- `deposit` – transfers lamports from an owner signer into the vault treasury PDA, maintaining a `VaultBalance` PDA per owner.
- `withdraw` – releases lamports to any recipient when invoked by the owner, admin, or delegated operator.

Events: `VaultDepositEvent`, `VaultWithdrawalEvent`.

### Wallet & Session Keys

- `init_wallet` – creates a `WalletState` account keyed by a client-supplied keypair and its treasury PDA. Stores owner weights, threshold, guardian metadata, and optional operator delegate.
- `set_wallet_operator` – owner-threshold gated update for the operator delegate.
- `execute_transfer` – owner-threshold gated lamport transfer from the wallet treasury PDA, optionally emitting a short memo.
- `register_session_key` – owner-threshold gated registration of a session capability PDA that enforces expiry, call counts, spend ceilings, and allowed programs.
- `execute_transfer_with_session` – allows a registered session key signer to move lamports subject to its limits.
- `revoke_session_key` – owner-threshold gated closure of a session key PDA.
- `operator_transfer` – lets the delegated operator execute transfers without collecting owner signatures.

Events: `WalletTransferEvent`, `SessionKeyRegistered`, `SessionKeyRevoked`.

### Guardian Recovery

- `guardian_initiate_recovery` – guardian signer starts a recovery proposal defining replacement owners/threshold and arming the cooldown.
- `guardian_vote_recovery` – additional guardians record approvals toward the quorum.
- `guardian_execute_recovery` – once the cooldown elapses and quorum is met, the wallet owners/threshold are replaced.

Events: `RecoveryProposed`, `RecoveryVote`, `RecoveryCompleted`.

## Testing Strategy

The `tests/program-test` crate spins up an in-memory validator and asserts:

- End-to-end vault deposit/withdraw accounting.
- Wallet threshold transfers, session key registration, and constrained session transfer usage.

Extend these tests with additional flows (e.g. guardian recovery) as new behaviour is implemented.

## Next Steps

- Integrate SPL Token support (e.g. token vault PDAs) if ERC-20 parity is required.
- Add JS/Python SDK bindings for client-side key management and encoding.
- Flesh out guardian recovery scenarios in program tests.
- Wire the Solana program IDs into the backend/frontend configuration layers that previously referenced Ethereum contracts.
