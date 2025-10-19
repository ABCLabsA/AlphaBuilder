# Alpha Builder – Frontend

React + Vite dashboard scaffold for account onboarding experiments.

## Features

- Email + password authentication views powered by a lightweight context provider.
- Placeholder marketing routes for products, resources, and blog content.
- Component library based on Tailwind UI primitives for rapid iteration.

## Environment

Copy `.env.example` to `.env` and point to the backend:

```
VITE_API_BASE_URL=http://localhost:4000
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_SIGNUP_PATH=/auth/signup
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

## Scripts

```bash
pnpm install
pnpm dev      # start Vite dev server
pnpm build    # production build
pnpm lint     # run ESLint
```
