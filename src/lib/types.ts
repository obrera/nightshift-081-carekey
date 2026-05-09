export type ActorMode = "patient" | "provider" | "clinic";

export type Bootstrap = {
  network: string;
  mpl: MplStatus;
  challenge: string;
  releaseScopes: string[];
  walletAuth: {
    domain: string;
    statement: string;
  };
};

export type Session = {
  sessionId: string;
  walletAddress: string;
  actor: ActorMode;
  expiresAt: string;
};

export type ConsentStatus = "draft" | "approved" | "released" | "revoked";

export type Consent = {
  id: string;
  patientWallet: string;
  providerName: string;
  verifierWallet: string;
  scopes: string[];
  expiresAt: string;
  releaseCode: string;
  status: ConsentStatus;
  createdAt: string;
  approvedAt?: string;
  issuedAsset?: string;
  issuedSignature?: string;
};

export type AuditEvent = {
  id: number;
  consentId: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type MplStatus = {
  chain: string;
  configured: boolean;
  missing: string[];
  mode: "wallet-signed";
  network: string;
  programAddress: string;
  rpcUrl: string;
};

export type IssuePlan = {
  consent: Consent;
  issue: {
    configured: boolean;
    missing: string[];
    mode: "wallet-signed";
    name: string;
    owner: string;
    programAddress: string;
    uri: string;
  };
  mpl: MplStatus;
};
