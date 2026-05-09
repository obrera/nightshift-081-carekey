// @ts-expect-error The locked runtime uses Bun's built-in sqlite module without installed Bun type packages.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.CAREKEY_DB_PATH ?? "data/carekey.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.exec("pragma journal_mode = WAL");

db.exec(`
  create table if not exists sessions (
    id text primary key,
    wallet_address text not null,
    actor text not null,
    nonce text not null,
    statement text not null,
    expires_at text not null,
    created_at text not null
  );

  create table if not exists consents (
    id text primary key,
    patient_wallet text not null,
    provider_name text not null,
    verifier_wallet text not null,
    scopes_json text not null,
    expires_at text not null,
    release_code text not null unique,
    status text not null,
    created_at text not null,
    approved_at text,
    issued_asset text,
    issued_signature text
  );

  create table if not exists audit_events (
    id integer primary key autoincrement,
    consent_id text not null,
    actor text not null,
    action text not null,
    detail text not null,
    created_at text not null
  );
`);

export type ConsentRow = {
  id: string;
  patient_wallet: string;
  provider_name: string;
  verifier_wallet: string;
  scopes_json: string;
  expires_at: string;
  release_code: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  issued_asset: string | null;
  issued_signature: string | null;
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function mapConsent(row: ConsentRow) {
  return {
    id: row.id,
    patientWallet: row.patient_wallet,
    providerName: row.provider_name,
    verifierWallet: row.verifier_wallet,
    scopes: JSON.parse(row.scopes_json) as string[],
    expiresAt: row.expires_at,
    releaseCode: row.release_code,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    issuedAsset: row.issued_asset ?? undefined,
    issuedSignature: row.issued_signature ?? undefined
  };
}

export function audit(consentId: string, actor: string, action: string, detail: string) {
  db.prepare(
    "insert into audit_events (consent_id, actor, action, detail, created_at) values (?, ?, ?, ?, ?)"
  ).run(consentId, actor, action, detail, nowIso());
}
