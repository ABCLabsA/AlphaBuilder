# Alpha Builder – Frontend

React + Vite dashboard scaffold for account onboarding experiments.

## Features

- Email + password authentication views powered by a lightweight context provider.
- Automatic Alchemy AA wallet provisioning for logged-in users, with keys
  safely kept in browser storage for prototyping.
- Placeholder marketing routes for products, resources, and blog content.
- Component library based on Tailwind UI primitives for rapid iteration.

## Environment

Copy `.env.example` to `.env` and point to the backend:

```
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
VITE_ALCHEMY_API_KEY=<alchemy-key>
VITE_ALCHEMY_CHAIN=baseSepolia
VITE_ALCHEMY_GAS_POLICY_ID=
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
local private key per email and creates a Light Account via Alchemy. Populate
`VITE_ALCHEMY_API_KEY` with a project key that has AA access on the target chain.
Set `VITE_ALCHEMY_CHAIN` using a supported chain name/ID (e.g. `baseSepolia` or
`84532`). If you have a Gas Manager policy, add its ID via
`VITE_ALCHEMY_GAS_POLICY_ID`; otherwise leave it blank and users will send
transactions from their own balance.

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```
