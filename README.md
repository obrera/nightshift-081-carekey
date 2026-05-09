# CareKey

CareKey is Nightshift build 081: a dark-mode, mobile-first Solana/NFT consent portal for medical record releases.

Patients create scoped, time-boxed release passes; providers verify release codes before accessing records; clinic operators issue an MPL Core access credential after approval. The live URL placeholder is `https://carekey081.colmena.dev`.

## Stack

- React, Vite, TypeScript, Tailwind
- TanStack React Query for API loading, errors, and mutations
- Hono JSON API and static frontend serving from one runtime
- SQLite durability through Bun's native SQLite runtime
- Solana wallet access uses the real `@wallet-ui/react` provider and connected wallet account state
- Client-side wallet transactions use `@solana/kit`
- MPL Core dependency: `@obrera/mpl-core-kit-lib`

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

`verify:runtime` exercises the API directly with a generated Solana keypair: it signs and verifies SIWS, creates a consent packet, approves it, verifies the release code, and checks the wallet-signed MPL issue plan. It must not pass by relying on `missing_config`.

Strict live issuance requires a connected browser wallet:

```bash
bun run dev
```

Connect a wallet, sign in, approve a packet, then use "Sign and issue MPL pass" in the wallet-signed MPL queue. The client builds the MPL Core `createV1` transaction and the connected wallet signs and submits it.

## Environment

- `CAREKEY_DB_PATH`: SQLite file path, defaults to `data/carekey.sqlite`
- `CAREKEY_MPL_RPC_URL`: Solana RPC URL, defaults to devnet

The server does not hold an issuer private key. `GET /api/consents/:id/issue-plan` returns wallet-signed MPL metadata, and the browser builds and submits the MPL Core `createV1` transaction through the connected wallet. `POST /api/consents/:id/issue` records the asset and signature only after the client reports a wallet-signed transaction result for the signed-in patient wallet.

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
- `GET /api/consents/:id/issue-plan`
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
