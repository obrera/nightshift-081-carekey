# CareKey

CareKey is Nightshift build 081: a dark-mode, mobile-first Solana/NFT consent portal for medical record releases.

Patients create scoped, time-boxed release passes; providers verify release codes before accessing records; clinic operators issue an MPL Core access credential after approval. The live URL placeholder is `https://carekey081.colmena.dev`.

## Stack

- React, Vite, TypeScript, Tailwind
- TanStack React Query for API loading, errors, and mutations
- Hono JSON API and static frontend serving from one runtime
- SQLite durability through Bun's native SQLite runtime
- Solana wallet access uses the real `@wallet-ui/react` provider and connected wallet account state
- Server-side Solana transactions use `@solana/kit`
- MPL Core server dependency: `@obrera/mpl-core-kit-lib`

## Runtime

```bash
bun install
bun run dev
bun run server
```

Build and verify:

```bash
bun run build
bun run check-types
bun run lint
bun run verify:runtime
```

`verify:runtime` exercises the API directly with deterministic wallet strings: it creates a SIWS session payload, creates a consent packet, approves it, verifies the release code, and calls the same issue endpoint used by the UI. With no MPL config it must pass in degraded mode by receiving `409 missing_config`.

Strict live issuance:

```bash
CAREKEY_EXPECT_ISSUED=true \
CAREKEY_BASE_URL=https://carekey081.colmena.dev \
CAREKEY_VERIFY_WALLET=<patient-wallet> \
bun run verify:runtime
```

## Environment

- `CAREKEY_DB_PATH`: SQLite file path, defaults to `data/carekey.sqlite`
- `MPL_RPC_URL`: Solana RPC URL
- `MPL_ISSUER_PRIVATE_KEY`: server issuer key material
- `MPL_ISSUER_ADDRESS`: issuer address

When the MPL variables are missing, `/api/consents/:id/issue` returns `409 missing_config` and does not fake asset or transaction data. When configured, the server builds, signs, and submits a real MPL Core `createV1` transaction through `@solana/kit` and returns the asset address and transaction signature only after send succeeds.

## API

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/mpl/status`
- `POST /api/auth/siws`
- `GET /api/consents`
- `POST /api/consents`
- `POST /api/consents/:id/approve`
- `POST /api/consents/:id/revoke`
- `POST /api/consents/:id/extend`
- `GET /api/verify/:code`
- `POST /api/consents/:id/issue`
- `GET /api/audit`

## Challenge Metadata

- Challenge: Nightshift build 081
- Model: GPT-5 Codex
- NFT use-case family: medical records / access control
- Primary actor: patient
- Why ownership matters: the patient wallet is the durable holder of the consent credential, making consent portable, revocable, and independently verifiable by providers.

## License

MIT
