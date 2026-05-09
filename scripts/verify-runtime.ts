const baseUrl = process.env.CAREKEY_BASE_URL ?? "http://127.0.0.1:8787";
const strictIssued = process.env.CAREKEY_EXPECT_ISSUED === "true";
const wallet = process.env.CAREKEY_VERIFY_WALLET ?? "11111111111111111111111111111111";

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

if (!process.env.CAREKEY_BASE_URL) {
  process.env.CAREKEY_DB_PATH = "data/verify-runtime.sqlite";
  localApp = (await import("../server/index.js")).app;
}

try {
  await waitForHealth();
  const bootstrap = await request<{ challenge: string; walletAuth: { domain: string; statement: string } }>("/api/bootstrap");
  const session = await request<{ sessionId: string }>("/api/auth/siws", {
    method: "POST",
    body: JSON.stringify({
      walletAddress: wallet,
      actor: "patient",
      domain: bootstrap.body.walletAuth.domain,
      statement: bootstrap.body.walletAuth.statement,
      nonce: bootstrap.body.challenge,
      signature: new TextEncoder().encode(`carekey:${wallet}:${bootstrap.body.challenge}`).join(".")
    })
  });
  if (session.status !== 200) throw new Error("SIWS-shaped session failed");

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
  if (created.status !== 201) throw new Error("Consent creation failed");

  const approved = await request<{ consent: { status: string } }>(`/api/consents/${created.body.consent.id}/approve`, {
    method: "POST",
    body: "{}"
  });
  if (approved.body.consent.status !== "approved") throw new Error("Consent approval failed");

  const verified = await request<{ valid: boolean }>(`/api/verify/${created.body.consent.releaseCode}`);
  if (!verified.body.valid) throw new Error("Provider verifier did not accept approved release code");

  const issued = await request<{ issued?: unknown; error?: string }>(`/api/consents/${created.body.consent.id}/issue`, {
    method: "POST",
    body: "{}"
  });

  if (strictIssued) {
    if (issued.status !== 200 || !issued.body.issued) throw new Error(`Strict issuance failed with status ${issued.status}`);
  } else if (issued.status !== 409 || issued.body.error !== "missing_config") {
    throw new Error(`Expected degraded missing_config issuance, got ${issued.status}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode: strictIssued ? "strict-issued" : "degraded-missing-config",
      consentId: created.body.consent.id,
      releaseCode: created.body.consent.releaseCode
    })
  );
} finally {
  localApp = undefined;
}
