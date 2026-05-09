# CareKey Build Log

## Metadata

- Project: CareKey
- Repo: `nightshift-081-carekey`
- Nightshift build: 081
- Timestamp: 2026-05-09T01:04:00Z
- Model: GPT-5 Codex
- Live URL placeholder: `https://carekey081.colmena.dev`
- NFT use-case family: medical records / access control
- Primary actor: patient
- Secondary actors: provider/verifier, clinic operator

## Starter Flow

Required preferred command attempted from this repo:

```bash
bun x create-seed@latest . -t bun-react-vite-solana-kit
```

It failed before scaffolding with:

```text
error: Unexpected accessing temporary directory. Please set $BUN_TMPDIR or $BUN_INSTALL
```

Retrying with `BUN_TMPDIR` and `BUN_INSTALL` set advanced package resolution but failed because the restricted environment refused the live package manifest request:

```text
error: ConnectionRefused downloading package manifest create-seed
```

Safest fallback used: manually created the same requested stack in this repo only: TypeScript, React, Vite, Tailwind, Hono, SQLite, Solana kit dependencies, and feature-boundary source layout.

## Scorecard

- Dark-mode mobile-first app: complete
- Semi-complex product shape: complete
- Feature boundaries under `src/features`: complete
- TanStack React Query for server loading/error/mutations: complete
- Hono backend serving JSON API and built frontend: complete
- Durable SQLite state with Bun native SQLite: complete
- Wallet-first SIWS auth path through `@wallet-ui/react`: complete
- Real MPL Core `createV1` transaction construction and submission path: complete
- Missing MPL config returns `409 missing_config`: complete
- Runtime verification script: complete
- Docker and compose deployment files: complete

## Product Notes

CareKey is not a generic CRUD dashboard. The core primitive is a patient-owned, time-boxed consent pass. A provider verifies a short release code against backend state, and a clinic operator issues the approved release as an MPL Core access credential when Solana issuer configuration is present.

Ownership matters because the patient wallet anchors the consent credential. The credential can be checked without relying on username/password identity and can represent a constrained authorization window for medical record release.

## Server-Signed Mint Disclosure

The server owns the issuer path. After approval, `/api/consents/:id/issue` builds, signs, and submits an MPL Core `createV1` transaction to the patient wallet only when `MPL_RPC_URL`, `MPL_ISSUER_PRIVATE_KEY`, and `MPL_ISSUER_ADDRESS` are configured. Missing configuration returns a clear `409 missing_config` response and no fake asset or transaction fields.
