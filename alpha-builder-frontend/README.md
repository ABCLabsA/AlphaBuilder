# Alpha Builder – Frontend

React + Vite dashboard scaffold for Solana smart-account onboarding experiments.

## Features

- Email + password authentication views powered by a lightweight context provider.
- Solana smart-account metadata provisioning for logged-in users, with encrypted
  key material stored locally and synced to the backend for Anchor program usage.
- Placeholder marketing routes for products, resources, and blog content.
- Component library based on Tailwind UI primitives for rapid iteration.

## Environment

Copy `.env.example` to `.env` and point to the backend and Solana cluster:

```
VITE_API_BASE_URL=http://localhost:3000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_PROGRAM_ID=AlphaBldr11111111111111111111111111111111111
VITE_SOLANA_COMMITMENT=processed
```

The auth provider posts credentials to the configured endpoints and expects a JSON
response of the form:

```json
{
  "token": "<jwt-or-session-token>",
  "user": { "email": "user@example.com", "name": "Jane Doe" }
}
```

Adjust the response parsing in `src/hooks/useEmailAuth.tsx` if your backend returns
different field names.

When authentication succeeds, the provider derives or retrieves a deterministic
local keypair per email, encrypts the secret, and persists the Solana address so
the backend can coordinate Anchor transactions against the on-chain vault/wallet
PDAs. Point `VITE_SOLANA_RPC_URL` to the cluster you are targeting (Devnet by
default) and keep `VITE_SOLANA_PROGRAM_ID` in sync with the deployed program ID.

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```
