# Alpha Builder – Frontend

React + Vite dashboard scaffold for account onboarding experiments.

## Features

- Email + password authentication views powered by a lightweight context provider.
- Automatic ZeroDev-compatible AA wallet provisioning for logged-in users, with keys
  safely kept in browser storage for prototyping.
- Placeholder marketing routes for products, resources, and blog content.
- Component library based on Tailwind UI primitives for rapid iteration.

## Environment

Copy `.env.example` to `.env` and point to the backend:

```
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_ZERODEV_BUNDLER_URL=https://rpc.zerodev.app/api/v2/bundler/<project-id>
VITE_ZERODEV_PAYMASTER_URL=https://rpc.zerodev.app/api/v2/paymaster/<project-id>
VITE_ZERODEV_ENTRY_POINT=0x0576a174D229E3cFA37253523E645A78A0C91B57
VITE_ZERODEV_FACTORY_ADDRESS=0x9406Cc6185a346906296840746125a0E44976454
VITE_ZERODEV_CHAIN_ID=84532
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
local private key per email and instantiates a `SimpleAccount` smart account via
ZeroDev’s ERC-4337 toolchain. Point `VITE_ZERODEV_BUNDLER_URL` to a ZeroDev RPC
(or any ERC-4337-enabled RPC), optionally override the entry point or factory
addresses if you are using custom deployments, and set `VITE_ZERODEV_CHAIN_ID`
to match your target network.

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```
