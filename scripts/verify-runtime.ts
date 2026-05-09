import { createSignableMessage, generateKeyPairSigner, getBase58Decoder } from "@solana/kit";

const baseUrl = process.env.CAREKEY_BASE_URL ?? "http://127.0.0.1:8787";
const strictIssued = process.env.CAREKEY_EXPECT_ISSUED === "true";

type LocalApp = {
  request: (path: string, init?: RequestInit) => Response | Promise<Response>;
};

let localApp: LocalApp | undefined;

async function request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const requestInit = {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  };
  const response = localApp ? await localApp.request(path, requestInit) : await fetch(`${baseUrl}${path}`, requestInit);
  return { status: response.status, body: (await response.json()) as T };
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await request<{ ok: boolean }>("/api/health");
      if (health.body.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("CareKey server did not become healthy");
}

function buildSiwsMessage(input: { domain: string; nonce: string; statement: string; wallet: string }) {
  return `${input.domain} wants you to sign in with your Solana account:
${input.wallet}

${input.statement}

URI: https://${input.domain}
Version: 1
Chain ID: solana:devnet
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
}

if (!process.env.CAREKEY_BASE_URL) {
  process.env.CAREKEY_DB_PATH = "data/verify-runtime.sqlite";
  localApp = (await import("../server/index.js")).app;
}

try {
  await waitForHealth();
  const signer = await generateKeyPairSigner();
  const wallet = signer.address;

  const bootstrap = await request<{
    challenge: string;
    mpl: { configured: boolean; missing: string[]; mode: string };
    walletAuth: { domain: string; statement: string };
  }>("/api/bootstrap");
  if (!bootstrap.body.mpl.configured || bootstrap.body.mpl.mode !== "wallet-signed" || bootstrap.body.mpl.missing.length > 0) {
    throw new Error("Bootstrap did not advertise wallet-signed MPL readiness");
  }

  const status = await request<{ configured: boolean; missing: string[]; mode: string }>("/api/mpl/status");
  if (!status.body.configured || status.body.mode !== "wallet-signed" || status.body.missing.length > 0) {
    throw new Error("MPL status did not advertise wallet-signed readiness");
  }

  const signedMessageText = buildSiwsMessage({
    domain: bootstrap.body.walletAuth.domain,
    nonce: bootstrap.body.challenge,
    statement: bootstrap.body.walletAuth.statement,
    wallet
  });
  const signedMessage = createSignableMessage(signedMessageText);
  const [signatures] = await signer.signMessages([signedMessage]);
  const signatureBytes = signatures[wallet];
  if (!signatureBytes) throw new Error("Local SIWS signer did not return a signature");

  const session = await request<{ sessionId: string }>("/api/auth/siws", {
    method: "POST",
    body: JSON.stringify({
      walletAddress: wallet,
      actor: "patient",
      domain: bootstrap.body.walletAuth.domain,
      statement: bootstrap.body.walletAuth.statement,
      nonce: bootstrap.body.challenge,
      signature: getBase58Decoder().decode(signatureBytes),
      signatureBytes: Array.from(signatureBytes),
      signedMessage: Array.from(signedMessage.content)
    })
  });
  if (session.status !== 200) throw new Error(`SIWS verification failed with status ${session.status}`);

  const created = await request<{ consent: { id: string; releaseCode: string } }>("/api/consents", {
    method: "POST",
    body: JSON.stringify({
      sessionId: session.body.sessionId,
      patientWallet: wallet,
      providerName: "Runtime Verification Clinic",
      verifierWallet: process.env.CAREKEY_VERIFY_PROVIDER_WALLET ?? "Vote111111111111111111111111111111111111111",
      scopes: ["Imaging and labs", "Medication history"],
      hoursValid: 48
    })
  });
  if (created.status !== 201) throw new Error(`Consent creation failed with status ${created.status}`);

  const approved = await request<{ consent: { status: string } }>(`/api/consents/${created.body.consent.id}/approve`, {
    method: "POST",
    body: JSON.stringify({ sessionId: session.body.sessionId, walletAddress: wallet })
  });
  if (approved.body.consent.status !== "approved") throw new Error("Consent approval failed");

  const verified = await request<{ valid: boolean }>(`/api/verify/${created.body.consent.releaseCode}`);
  if (!verified.body.valid) throw new Error("Provider verifier did not accept approved release code");

  const issuePlan = await request<{
    issue: { missing: string[]; mode: string; owner: string; uri: string };
  }>(`/api/consents/${created.body.consent.id}/issue-plan`);
  if (issuePlan.status !== 200) throw new Error(`Issue plan failed with status ${issuePlan.status}`);
  if (issuePlan.body.issue.mode !== "wallet-signed" || issuePlan.body.issue.missing.length > 0) {
    throw new Error("Issue plan did not return wallet-signed readiness");
  }
  if (issuePlan.body.issue.owner !== wallet) throw new Error("Issue plan owner does not match signed-in wallet");

  if (strictIssued) {
    throw new Error("Strict live issuance requires a connected browser wallet; run the UI wallet-signing flow.");
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode: "wallet-signed-plan",
      consentId: created.body.consent.id,
      releaseCode: created.body.consent.releaseCode,
      issueUri: issuePlan.body.issue.uri
    })
  );
} finally {
  localApp = undefined;
}
