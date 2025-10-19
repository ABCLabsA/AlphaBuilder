# Alpha Builder – Frontend

React + Vite dashboard for orchestrating the dual onboarding experience.

## Features

- Binance custodial users can submit API credentials, fetch live balances, and deploy a shadow AA
  wallet whose signatures can be aggregated with the custodial key.
- Native users start a zk-email session, receive the Poseidon commitment, and submit the proof +
  nullifier to mint their wallet.
- Result panel surfaces the deterministic AA address, JWT token, and (for Binance) the mirrored
  balances returned by the backend.

## Environment

Copy `.env.example` to `.env` and point to the backend:

```
VITE_API_BASE_URL=http://localhost:4000
```

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```

## Proof generation

The UI expects zk-email proofs as `0x`-prefixed hex strings. Integrate with your prover pipeline and
paste the proof, nullifier, and target user operation hash into the verification form. The backend
validates the proof against the configured on-chain verifier and consumes the nullifier.
