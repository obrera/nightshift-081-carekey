import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { address, getPublicKeyFromAddress, signatureBytes, verifySignature } from "@solana/kit";
import { z } from "zod";
import { audit, db, mapConsent, nowIso, type ConsentRow } from "./db.js";
import { issueMetadata, issueStatus, issueUri, mplStatus } from "./mpl.js";

export const app = new Hono();
const scopes = ["Full record packet", "Imaging and labs", "Medication history", "Specialist notes"];

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function releaseCode() {
  return `CK-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

app.get("/api/health", (c) => c.json({ ok: true, service: "carekey", time: nowIso() }));

app.get("/api/bootstrap", (c) => {
  const mpl = mplStatus();
  return c.json({
    mpl,
    network: mpl.network,
    challenge: crypto.randomUUID(),
    releaseScopes: scopes,
    walletAuth: {
      domain: "carekey081.colmena.dev",
      statement: "Sign in with Solana to manage time-boxed medical record access."
    }
  });
});

app.get("/api/mpl/status", (c) => c.json(mplStatus()));

app.post("/api/auth/siws", async (c) => {
  const body = z
    .object({
      walletAddress: z.string().min(32),
      actor: z.enum(["patient", "provider", "clinic"]),
      domain: z.string().min(3),
      statement: z.string().min(10),
      nonce: z.string().min(6),
      signature: z.string().min(8).optional(),
      signatureBytes: z.array(z.number().int().min(0).max(255)).length(64),
      signedMessage: z.array(z.number().int().min(0).max(255)).min(1)
    })
    .parse(await c.req.json());

  const signedMessage = new Uint8Array(body.signedMessage);
  const signedSignature = signatureBytes(new Uint8Array(body.signatureBytes));
  const publicKey = await getPublicKeyFromAddress(address(body.walletAddress));
  const validSignature = await verifySignature(publicKey, signedSignature, signedMessage);
  if (!validSignature) return c.json({ error: "invalid_signature" }, 401);

  const signedText = new TextDecoder().decode(signedMessage);
  if (
    !signedText.startsWith(`${body.domain} wants you to sign in with your Solana account:\n${body.walletAddress}`) ||
    !signedText.includes(body.statement) ||
    !signedText.includes(`Nonce: ${body.nonce}`)
  ) {
    return c.json({ error: "invalid_siws_message" }, 401);
  }

  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
  const sessionId = id("sess");

  db.prepare(
    "insert into sessions (id, wallet_address, actor, nonce, statement, expires_at, created_at) values (?, ?, ?, ?, ?, ?, ?)"
  ).run(sessionId, body.walletAddress, body.actor, body.nonce, body.statement, expiresAt, createdAt);

  return c.json({ sessionId, walletAddress: body.walletAddress, actor: body.actor, expiresAt });
});

app.get("/api/consents", (c) => {
  const wallet = c.req.query("wallet");
  const rows = db
    .prepare(
      wallet
        ? "select * from consents where patient_wallet = ? order by created_at desc"
        : "select * from consents order by created_at desc"
    )
    .all(...(wallet ? [wallet] : [])) as ConsentRow[];
  return c.json({ consents: rows.map(mapConsent) });
});

app.post("/api/consents", async (c) => {
  const body = z
    .object({
      sessionId: z.string().min(8),
      patientWallet: z.string().min(32),
      providerName: z.string().min(2),
      verifierWallet: z.string().min(32),
      scopes: z.array(z.string()).min(1),
      hoursValid: z.number().int().min(1).max(720)
    })
    .parse(await c.req.json());

  const session = requireSession(body.sessionId, body.patientWallet, "patient");
  if (!session.ok) return c.json({ error: session.error }, session.status);

  const consentId = id("consent");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + body.hoursValid * 60 * 60 * 1000).toISOString();
  db.prepare(
    `insert into consents
      (id, patient_wallet, provider_name, verifier_wallet, scopes_json, expires_at, release_code, status, created_at)
      values (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`
  ).run(
    consentId,
    body.patientWallet,
    body.providerName,
    body.verifierWallet,
    JSON.stringify(body.scopes),
    expiresAt,
    releaseCode(),
    createdAt
  );
  audit(consentId, body.patientWallet, "created", `Consent packet for ${body.providerName}`);
  const row = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow;
  return c.json({ consent: mapConsent(row) }, 201);
});

app.post("/api/consents/:id/approve", async (c) => {
  const body = sessionBody.parse(await c.req.json());
  const session = requireSession(body.sessionId, body.walletAddress, "patient");
  if (!session.ok) return c.json({ error: session.error }, session.status);
  const consentId = c.req.param("id");
  const approvedAt = nowIso();
  const result = db
    .prepare(
      "update consents set status = 'approved', approved_at = ? where id = ? and patient_wallet = ? and status in ('draft', 'released')"
    )
    .run(approvedAt, consentId, body.walletAddress);
  if (result.changes === 0) return c.json({ error: "not_approvable" }, 409);
  audit(consentId, body.walletAddress, "approved", "Patient approved time-boxed record release");
  const row = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow;
  return c.json({ consent: mapConsent(row) });
});

app.post("/api/consents/:id/revoke", async (c) => {
  const body = sessionBody.parse(await c.req.json());
  const session = requireSession(body.sessionId, body.walletAddress, "patient");
  if (!session.ok) return c.json({ error: session.error }, session.status);
  const consentId = c.req.param("id");
  const result = db
    .prepare("update consents set status = 'revoked' where id = ? and patient_wallet = ?")
    .run(consentId, body.walletAddress);
  if (result.changes === 0) return c.json({ error: "not_found" }, 404);
  audit(consentId, body.walletAddress, "revoked", "Patient revoked provider access");
  const row = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow;
  return c.json({ consent: mapConsent(row) });
});

app.post("/api/consents/:id/extend", async (c) => {
  const body = sessionBody.extend({ hours: z.number().int().min(1).max(720) }).parse(await c.req.json());
  const session = requireSession(body.sessionId, body.walletAddress, "patient");
  if (!session.ok) return c.json({ error: session.error }, session.status);
  const consentId = c.req.param("id");
  const expiresAt = new Date(Date.now() + body.hours * 60 * 60 * 1000).toISOString();
  const result = db
    .prepare("update consents set expires_at = ? where id = ? and patient_wallet = ? and status != 'revoked'")
    .run(expiresAt, consentId, body.walletAddress);
  if (result.changes === 0) return c.json({ error: "not_extendable" }, 409);
  audit(consentId, body.walletAddress, "extended", `Extended for ${body.hours} hours`);
  const row = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow;
  return c.json({ consent: mapConsent(row) });
});

app.get("/api/verify/:code", (c) => {
  const row = db.prepare("select * from consents where release_code = ?").get(c.req.param("code")) as ConsentRow | undefined;
  if (!row) return c.json({ error: "not_found" }, 404);
  audit(row.id, "provider", "verified", "Provider checked release code");
  return c.json({ consent: mapConsent(row), valid: row.status === "approved" && new Date(row.expires_at) > new Date() });
});

app.get("/api/consents/:id/issue-plan", (c) => {
  const consentId = c.req.param("id");
  const row = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow | undefined;
  if (!row) return c.json({ error: "not_found" }, 404);
  if (row.status !== "approved") return c.json({ error: "not_approved" }, 409);

  const scopes = JSON.parse(row.scopes_json) as string[];
  return c.json({
    consent: mapConsent(row),
    issue: {
      ...issueStatus(),
      ...issueMetadata({ consentId: row.id, expiresAt: row.expires_at, providerName: row.provider_name, scopes }),
      owner: row.patient_wallet,
      uri: issueUri({ consentId: row.id, expiresAt: row.expires_at, scopes })
    },
    mpl: mplStatus()
  });
});

app.post("/api/consents/:id/issue", async (c) => {
  const body = sessionBody
    .extend({
      asset: z.string().min(32),
      signature: z.string().min(32)
    })
    .parse(await c.req.json());
  const session = requireSession(body.sessionId, body.walletAddress, "patient");
  if (!session.ok) return c.json({ error: session.error }, session.status);

  const consentId = c.req.param("id");
  const result = db
    .prepare(
      "update consents set status = 'released', issued_asset = ?, issued_signature = ? where id = ? and patient_wallet = ? and status = 'approved'"
    )
    .run(body.asset, body.signature, consentId, body.walletAddress);
  if (result.changes === 0) return c.json({ error: "not_approved" }, 409);

  audit(consentId, body.walletAddress, "issued", "Patient wallet signed and submitted MPL Core consent pass");
  const updated = db.prepare("select * from consents where id = ?").get(consentId) as ConsentRow;
  return c.json({
    consent: mapConsent(updated),
    issued: {
      ok: true,
      asset: body.asset,
      mode: "wallet-signed",
      signature: body.signature
    }
  });
});

const sessionBody = z.object({
  sessionId: z.string().min(8),
  walletAddress: z.string().min(32)
});

function requireSession(sessionId: string, walletAddress: string, actor: "patient") {
  const row = db
    .prepare("select * from sessions where id = ? and wallet_address = ? and actor = ?")
    .get(sessionId, walletAddress, actor) as { expires_at: string } | undefined;
  if (!row) return { ok: false as const, status: 401 as const, error: "invalid_session" };
  if (new Date(row.expires_at) <= new Date()) return { ok: false as const, status: 401 as const, error: "session_expired" };
  return { ok: true as const };
}

app.get("/api/audit", (c) => {
  const rows = db.prepare("select * from audit_events order by created_at desc limit 50").all();
  return c.json({ events: rows });
});

const distPath = join(process.cwd(), "dist");
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = Number(process.env.PORT ?? 8787);
if (process.argv[1]?.endsWith("server/index.ts") || process.argv[1]?.endsWith("server/index.js")) {
  const bunRuntime = (globalThis as { Bun?: { serve: (options: { fetch: typeof app.fetch; port: number }) => unknown } }).Bun;
  if (!bunRuntime) {
    throw new Error("CareKey server must run on Bun.");
  }
  bunRuntime.serve({ fetch: app.fetch, port });
  console.log(`CareKey listening on ${port}`);
}
